using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.ReportCenter;
using PPS.LicenseManager.API.DTOs.ReportCenter.Rows;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services.ReportCenter;

public class ReportCenterService : IReportCenterService
{
    public const int MaxExportRows = 50_000;
    private const int MaxPageSize = 200;
    private const string XlsxContentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly ApplicationDbContext _context;
    private readonly IReportExcelExportService _excelExportService;
    private readonly Dictionary<string, ReportDefinition> _definitions;

    public ReportCenterService(
        ApplicationDbContext context,
        IReportExcelExportService excelExportService)
    {
        _context = context;
        _excelExportService = excelExportService;
        _definitions = ReportCatalog.Build(this).ToDictionary(d => d.Id);
    }

    public List<ReportCatalogEntryResponse> GetCatalog()
    {
        return _definitions.Values
            .OrderBy(d => d.Category)
            .ThenBy(d => d.Title)
            .Select(d => new ReportCatalogEntryResponse
            {
                Id = d.Id,
                Title = d.Title,
                Category = d.Category,
                Description = d.Description,
                Filters = d.Filters
                    .Select(f => new ReportFilterFieldResponse
                    {
                        Key = f.Key,
                        Label = f.Label,
                        Type = f.Type,
                        Options = f.Options,
                        DefaultValue = f.DefaultValue,
                    })
                    .ToList(),
            })
            .ToList();
    }

    public bool IsReportAllowedForRole(string reportId, string role)
    {
        if (!_definitions.TryGetValue(reportId, out var definition))
        {
            // Unknown report - let RunPreviewAsync/RunExportAsync's own
            // 404 be the error the caller sees, not a misleading 403.
            return true;
        }

        return definition.RequiredRoles == null || definition.RequiredRoles.Contains(role);
    }

    public async Task<ReportPreviewEnvelope?> RunPreviewAsync(
        string reportId,
        ReportQueryRequest request,
        bool isEntityRestricted,
        int? companyId)
    {
        if (!_definitions.TryGetValue(reportId, out var definition))
        {
            return null;
        }

        ClampPaging(request);

        var result = await definition.RunPreview(request, isEntityRestricted, companyId);
        var appliedFilters = await BuildAppliedFiltersAsync(request);

        return new ReportPreviewEnvelope
        {
            ReportId = definition.Id,
            ReportTitle = definition.Title,
            Result = result,
            AppliedFilters = appliedFilters,
            GeneratedAtUtc = DateTime.UtcNow,
        };
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)?> RunExportAsync(
        string reportId,
        ReportQueryRequest request,
        bool isEntityRestricted,
        int? companyId,
        ClaimsPrincipal user)
    {
        if (!_definitions.TryGetValue(reportId, out var definition))
        {
            return null;
        }

        return await definition.RunExport(request, isEntityRestricted, companyId, user);
    }

    private static void ClampPaging(ReportQueryRequest request)
    {
        if (request.Page < 1)
        {
            request.Page = 1;
        }

        if (request.PageSize < 1)
        {
            request.PageSize = 20;
        }
        else if (request.PageSize > MaxPageSize)
        {
            request.PageSize = MaxPageSize;
        }
    }

    private static int? ResolveEffectiveCompanyId(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        return isRestricted ? companyId : request.CompanyId;
    }

    public static ReportQueryRequest WithForcedStatus(ReportQueryRequest request, string status)
    {
        return new ReportQueryRequest
        {
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            ClientId = request.ClientId,
            LocationId = request.LocationId,
            DateFrom = request.DateFrom,
            DateTo = request.DateTo,
            Status = status,
            Search = request.Search,
            VendorId = request.VendorId,
            SoftwareId = request.SoftwareId,
            AssetType = request.AssetType,
            GroupBy = request.GroupBy,
            Page = request.Page,
            PageSize = request.PageSize,
            SortBy = request.SortBy,
            SortDirection = request.SortDirection,
        };
    }

    private static async Task<PagedResponse<TRow>> PaginateAndBuildAsync<TRow>(
        IQueryable<TRow> query, int page, int pageSize)
    {
        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PagedResponse<TRow>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalRecords = total,
        };
    }

    private async Task<List<AppliedFilterEntry>> BuildAppliedFiltersAsync(ReportQueryRequest request)
    {
        var entries = new List<AppliedFilterEntry>();

        if (request.CompanyId.HasValue)
        {
            var name = await _context.Companies
                .Where(c => c.Id == request.CompanyId.Value)
                .Select(c => c.Name)
                .FirstOrDefaultAsync();
            entries.Add(new AppliedFilterEntry { Label = "Entity", Value = name ?? $"#{request.CompanyId}" });
        }

        if (request.DepartmentId.HasValue)
        {
            var name = await _context.Departments
                .Where(d => d.Id == request.DepartmentId.Value)
                .Select(d => d.DepartmentName)
                .FirstOrDefaultAsync();
            entries.Add(new AppliedFilterEntry { Label = "Department", Value = name ?? $"#{request.DepartmentId}" });
        }

        if (request.LocationId.HasValue)
        {
            var name = await _context.OfficeLocations
                .Where(l => l.Id == request.LocationId.Value)
                .Select(l => l.LocationName)
                .FirstOrDefaultAsync();
            entries.Add(new AppliedFilterEntry { Label = "Location", Value = name ?? $"#{request.LocationId}" });
        }

        if (request.ClientId.HasValue)
        {
            var name = await _context.Clients
                .Where(c => c.Id == request.ClientId.Value)
                .Select(c => c.Name)
                .FirstOrDefaultAsync();
            entries.Add(new AppliedFilterEntry { Label = "Client", Value = name ?? $"#{request.ClientId}" });
        }

        if (request.VendorId.HasValue)
        {
            var name = await _context.Vendors
                .Where(v => v.Id == request.VendorId.Value)
                .Select(v => v.VendorName)
                .FirstOrDefaultAsync();
            entries.Add(new AppliedFilterEntry { Label = "Vendor", Value = name ?? $"#{request.VendorId}" });
        }

        if (request.SoftwareId.HasValue)
        {
            var name = await _context.Software
                .Where(s => s.Id == request.SoftwareId.Value)
                .Select(s => s.Name)
                .FirstOrDefaultAsync();
            entries.Add(new AppliedFilterEntry { Label = "Software", Value = name ?? $"#{request.SoftwareId}" });
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            entries.Add(new AppliedFilterEntry { Label = "Status", Value = request.Status });
        }

        if (!string.IsNullOrWhiteSpace(request.AssetType))
        {
            entries.Add(new AppliedFilterEntry { Label = "Asset Type", Value = request.AssetType });
        }

        if (request.DateFrom.HasValue || request.DateTo.HasValue)
        {
            var from = request.DateFrom?.ToString("yyyy-MM-dd") ?? "…";
            var to = request.DateTo?.ToString("yyyy-MM-dd") ?? "…";
            entries.Add(new AppliedFilterEntry { Label = "Date Range", Value = $"{from} to {to}" });
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            entries.Add(new AppliedFilterEntry { Label = "Search", Value = request.Search });
        }

        if (!string.IsNullOrWhiteSpace(request.GroupBy))
        {
            entries.Add(new AppliedFilterEntry { Label = "Group By", Value = request.GroupBy });
        }

        return entries;
    }

    private static string ResolveUserName(ClaimsPrincipal user)
    {
        return user.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown User";
    }

    private static string BuildFileName(string slug)
    {
        return $"{slug}_{DateTime.UtcNow:yyyy-MM-dd}.xlsx";
    }

    private static readonly Expression<Func<Asset, AssetRegisterRow>> AssetRegisterProjection = a => new AssetRegisterRow
    {
        AssetTag = a.AssetTag,
        AssetName = a.AssetName,
        AssetType = a.AssetType,
        Manufacturer = a.Manufacturer,
        Model = a.Model,
        SerialNumber = a.SerialNumber,
        DepartmentName = a.Department != null ? a.Department.DepartmentName : string.Empty,
        CompanyName = a.Department != null && a.Department.Company != null ? a.Department.Company.Name : null,
        CurrentLocationName = a.CurrentLocation != null ? a.CurrentLocation.LocationName : null,
        Status = a.Status,
        OwnershipType = a.OwnershipType,
        VendorName = a.Vendor != null ? a.Vendor.VendorName : null,
        PurchaseDate = a.PurchaseDate,
        WarrantyExpiry = a.WarrantyExpiry,
        PurchaseCost = a.PurchaseCost,
        PrNumber = a.PurchaseRequisition != null ? a.PurchaseRequisition.PrNumber : null,
        PoNumber = a.PurchaseRequisition != null ? a.PurchaseRequisition.PoNumber : null,
        PoDate = a.PurchaseRequisition != null ? a.PurchaseRequisition.PoDate : null,
        PoAmount = a.PurchaseRequisition != null ? a.PurchaseRequisition.PoAmount : null,
        IsActive = a.IsActive,
    };

    private IQueryable<Asset> BuildAssetRegisterBaseQuery(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        var effectiveCompanyId = ResolveEffectiveCompanyId(request, isRestricted, companyId);

        var query = _context.Assets
            .Include(a => a.Department).ThenInclude(d => d!.Company)
            .Include(a => a.CurrentLocation)
            .Include(a => a.Vendor)
            .Include(a => a.PurchaseRequisition)
            .Where(a => a.IsActive);

        if (effectiveCompanyId.HasValue)
        {
            query = query.Where(a => a.Department != null && a.Department.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            query = query.Where(a => a.DepartmentId == request.DepartmentId.Value);
        }

        if (request.LocationId.HasValue)
        {
            query = query.Where(a => a.CurrentLocationId == request.LocationId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(a => a.Status == request.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.AssetType))
        {
            query = query.Where(a => a.AssetType == request.AssetType);
        }

        if (request.DateFrom.HasValue)
        {
            query = query.Where(a => a.PurchaseDate != null && a.PurchaseDate >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            query = query.Where(a => a.PurchaseDate != null && a.PurchaseDate <= request.DateTo.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(a =>
                a.AssetTag.Contains(term) ||
                a.AssetName.Contains(term) ||
                a.SerialNumber.Contains(term));
        }

        return query;
    }

    private static List<ExcelColumn<AssetRegisterRow>> AssetRegisterColumns() => new()
    {
        new() { Header = "Asset Tag", ValueSelector = r => r.AssetTag },
        new() { Header = "Asset Name", ValueSelector = r => r.AssetName },
        new() { Header = "Asset Type", ValueSelector = r => r.AssetType },
        new() { Header = "Manufacturer", ValueSelector = r => r.Manufacturer },
        new() { Header = "Model", ValueSelector = r => r.Model },
        new() { Header = "Serial Number", ValueSelector = r => r.SerialNumber },
        new() { Header = "Entity", ValueSelector = r => r.CompanyName },
        new() { Header = "Department", ValueSelector = r => r.DepartmentName },
        new() { Header = "Current Location", ValueSelector = r => r.CurrentLocationName },
        new() { Header = "Status", ValueSelector = r => r.Status },
        new() { Header = "Ownership", ValueSelector = r => r.OwnershipType },
        new() { Header = "Vendor", ValueSelector = r => r.VendorName },
        new() { Header = "Purchase Date", ValueSelector = r => r.PurchaseDate, Format = ExcelNumberFormat.Date },
        new() { Header = "Warranty Expiry", ValueSelector = r => r.WarrantyExpiry, Format = ExcelNumberFormat.Date },
        new() { Header = "Purchase Cost", ValueSelector = r => r.PurchaseCost, Format = ExcelNumberFormat.Currency },
        new() { Header = "PR Number", ValueSelector = r => r.PrNumber },
        new() { Header = "PO Number", ValueSelector = r => r.PoNumber },
        new() { Header = "PO Date", ValueSelector = r => r.PoDate, Format = ExcelNumberFormat.Date },
        new() { Header = "PO Amount", ValueSelector = r => r.PoAmount, Format = ExcelNumberFormat.Currency },
    };

    public async Task<object> GetAssetRegisterPreviewAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        if (isRestricted && companyId == null)
        {
            return new PagedResponse<AssetRegisterRow>
            {
                Items = new List<AssetRegisterRow>(),
                Page = request.Page,
                PageSize = request.PageSize,
                TotalRecords = 0,
            };
        }

        var query = BuildAssetRegisterBaseQuery(request, isRestricted, companyId)
            .OrderBy(a => a.AssetTag)
            .Select(AssetRegisterProjection);

        return await PaginateAndBuildAsync(query, request.Page, request.PageSize);
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> GetAssetRegisterExportAsync(
        ReportQueryRequest request,
        bool isRestricted,
        int? companyId,
        ClaimsPrincipal user,
        string reportTitle,
        string fileSlug)
    {
        var meta = new ExcelWorkbookMeta
        {
            ReportTitle = reportTitle,
            GeneratedByUserName = ResolveUserName(user),
            GeneratedAtUtc = DateTime.UtcNow,
            AppliedFilters = await BuildAppliedFiltersAsync(request),
        };

        if (isRestricted && companyId == null)
        {
            var emptyBytes = _excelExportService.BuildWorkbook(meta, new List<AssetRegisterRow>(), AssetRegisterColumns());
            return (emptyBytes, XlsxContentType, BuildFileName(fileSlug));
        }

        var baseQuery = BuildAssetRegisterBaseQuery(request, isRestricted, companyId);
        var totalCount = await baseQuery.CountAsync();
        if (totalCount > MaxExportRows)
        {
            throw new ReportExportTooLargeException(totalCount);
        }

        var rows = await baseQuery.OrderBy(a => a.AssetTag).Select(AssetRegisterProjection).ToListAsync();
        meta.RecordCount = rows.Count;

        var bytes = _excelExportService.BuildWorkbook(meta, rows, AssetRegisterColumns());
        return (bytes, XlsxContentType, BuildFileName(fileSlug));
    }

    private static readonly Expression<Func<License, LicenseRegisterRow>> LicenseRegisterProjection = l => new LicenseRegisterRow
    {
        AliasCode = l.AliasCode,
        SoftwareName = l.Software.Name,
        LicensedEmail = l.LicensedEmail,
        Vendor = l.LicensePurchase != null ? l.LicensePurchase.Vendor : null,
        CompanyName = l.LicensePurchase != null && l.LicensePurchase.Company != null ? l.LicensePurchase.Company.Name : null,
        DepartmentName = l.LicensePurchase != null && l.LicensePurchase.Department != null ? l.LicensePurchase.Department.DepartmentName : null,
        Status = l.Status,
        PurchaseDate = l.PurchaseDate,
        ExpiryDate = l.ExpiryDate,
        PurchaseCost = l.PurchaseCost,
    };

    private IQueryable<License> BuildLicenseRegisterBaseQuery(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        var effectiveCompanyId = ResolveEffectiveCompanyId(request, isRestricted, companyId);

        var query = _context.Licenses
            .Include(l => l.Software)
            .Include(l => l.LicensePurchase).ThenInclude(lp => lp!.Company)
            .Include(l => l.LicensePurchase).ThenInclude(lp => lp!.Department)
            .Where(l => l.IsActive);

        if (effectiveCompanyId.HasValue)
        {
            query = query.Where(l => l.LicensePurchase != null && l.LicensePurchase.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            query = query.Where(l => l.LicensePurchase != null && l.LicensePurchase.DepartmentId == request.DepartmentId.Value);
        }

        if (request.SoftwareId.HasValue)
        {
            query = query.Where(l => l.SoftwareId == request.SoftwareId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(l => l.Status == request.Status);
        }

        if (request.DateFrom.HasValue)
        {
            query = query.Where(l => l.ExpiryDate >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            query = query.Where(l => l.ExpiryDate <= request.DateTo.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(l => l.AliasCode.Contains(term) || l.LicensedEmail.Contains(term));
        }

        return query;
    }

    private static List<ExcelColumn<LicenseRegisterRow>> LicenseRegisterColumns() => new()
    {
        new() { Header = "Alias Code", ValueSelector = r => r.AliasCode },
        new() { Header = "Software", ValueSelector = r => r.SoftwareName },
        new() { Header = "Licensed Email", ValueSelector = r => r.LicensedEmail },
        new() { Header = "Vendor", ValueSelector = r => r.Vendor },
        new() { Header = "Entity", ValueSelector = r => r.CompanyName },
        new() { Header = "Department", ValueSelector = r => r.DepartmentName },
        new() { Header = "Status", ValueSelector = r => r.Status },
        new() { Header = "Purchase Date", ValueSelector = r => r.PurchaseDate, Format = ExcelNumberFormat.Date },
        new() { Header = "Expiry Date", ValueSelector = r => r.ExpiryDate, Format = ExcelNumberFormat.Date },
        new() { Header = "Purchase Cost", ValueSelector = r => r.PurchaseCost, Format = ExcelNumberFormat.Currency },
    };

    public async Task<object> GetLicenseRegisterPreviewAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        if (isRestricted && companyId == null)
        {
            return new PagedResponse<LicenseRegisterRow>
            {
                Items = new List<LicenseRegisterRow>(),
                Page = request.Page,
                PageSize = request.PageSize,
                TotalRecords = 0,
            };
        }

        var query = BuildLicenseRegisterBaseQuery(request, isRestricted, companyId)
            .OrderBy(l => l.AliasCode)
            .Select(LicenseRegisterProjection);

        return await PaginateAndBuildAsync(query, request.Page, request.PageSize);
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> GetLicenseRegisterExportAsync(
        ReportQueryRequest request,
        bool isRestricted,
        int? companyId,
        ClaimsPrincipal user,
        string reportTitle,
        string fileSlug)
    {
        var meta = new ExcelWorkbookMeta
        {
            ReportTitle = reportTitle,
            GeneratedByUserName = ResolveUserName(user),
            GeneratedAtUtc = DateTime.UtcNow,
            AppliedFilters = await BuildAppliedFiltersAsync(request),
        };

        if (isRestricted && companyId == null)
        {
            var emptyBytes = _excelExportService.BuildWorkbook(meta, new List<LicenseRegisterRow>(), LicenseRegisterColumns());
            return (emptyBytes, XlsxContentType, BuildFileName(fileSlug));
        }

        var baseQuery = BuildLicenseRegisterBaseQuery(request, isRestricted, companyId);
        var totalCount = await baseQuery.CountAsync();
        if (totalCount > MaxExportRows)
        {
            throw new ReportExportTooLargeException(totalCount);
        }

        var rows = await baseQuery.OrderBy(l => l.AliasCode).Select(LicenseRegisterProjection).ToListAsync();
        meta.RecordCount = rows.Count;

        var bytes = _excelExportService.BuildWorkbook(meta, rows, LicenseRegisterColumns());
        return (bytes, XlsxContentType, BuildFileName(fileSlug));
    }

    public async Task<object> GetItCostSummaryPreviewAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        return await BuildItCostSummaryAsync(request, isRestricted, companyId);
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> GetItCostSummaryExportAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId, ClaimsPrincipal user)
    {
        var summary = await BuildItCostSummaryAsync(request, isRestricted, companyId);

        var meta = new ExcelWorkbookMeta
        {
            ReportTitle = "IT Cost Summary",
            GeneratedByUserName = ResolveUserName(user),
            GeneratedAtUtc = DateTime.UtcNow,
            AppliedFilters = await BuildAppliedFiltersAsync(request),
            RecordCount = summary.AssetCount + summary.LicenseCount + summary.ApprovedPurchaseCount,
        };

        var kpiRows = new List<(string Metric, decimal Value)>
        {
            ("Total Asset Cost", summary.TotalAssetCost),
            ("Total License Cost", summary.TotalLicenseCost),
            ("Total Approved Purchase Cost", summary.TotalApprovedPurchaseCost),
            ("Grand Total", summary.GrandTotal),
        };

        var kpiColumns = new List<ExcelColumn<(string Metric, decimal Value)>>
        {
            new() { Header = "Metric", ValueSelector = r => r.Metric },
            new() { Header = "Amount", ValueSelector = r => r.Value, Format = ExcelNumberFormat.Currency },
        };

        var breakdownSheets = new List<ExcelBreakdownSheet>
        {
            new()
            {
                SheetName = "By Entity",
                Headers = new List<string> { "Entity", "Asset Cost", "License Cost", "Total Cost" },
                Rows = summary.ByEntity
                    .Select(e => new object?[] { e.EntityName, e.AssetCost, e.LicenseCost, e.TotalCost })
                    .ToList(),
            },
            new()
            {
                SheetName = "By Department",
                Headers = new List<string> { "Department", "Entity", "Asset Cost", "License Cost", "Total Cost" },
                Rows = summary.ByDepartment
                    .Select(d => new object?[] { d.DepartmentName, d.EntityName, d.AssetCost, d.LicenseCost, d.TotalCost })
                    .ToList(),
            },
        };

        var bytes = _excelExportService.BuildWorkbook(meta, kpiRows, kpiColumns, breakdownSheets);
        return (bytes, XlsxContentType, BuildFileName("IT_Cost_Summary"));
    }

    private async Task<ItCostSummaryResponse> BuildItCostSummaryAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        if (isRestricted && companyId == null)
        {
            return new ItCostSummaryResponse();
        }

        var effectiveCompanyId = ResolveEffectiveCompanyId(request, isRestricted, companyId);

        var assetQuery = _context.Assets
            .Include(a => a.Department).ThenInclude(d => d!.Company)
            .Where(a => a.IsActive);

        if (effectiveCompanyId.HasValue)
        {
            assetQuery = assetQuery.Where(a => a.Department != null && a.Department.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            assetQuery = assetQuery.Where(a => a.DepartmentId == request.DepartmentId.Value);
        }

        if (request.DateFrom.HasValue)
        {
            assetQuery = assetQuery.Where(a => a.PurchaseDate != null && a.PurchaseDate >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            assetQuery = assetQuery.Where(a => a.PurchaseDate != null && a.PurchaseDate <= request.DateTo.Value);
        }

        var licenseQuery = _context.Licenses
            .Include(l => l.LicensePurchase).ThenInclude(lp => lp!.Company)
            .Where(l => l.IsActive);

        if (effectiveCompanyId.HasValue)
        {
            licenseQuery = licenseQuery.Where(l => l.LicensePurchase != null && l.LicensePurchase.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            licenseQuery = licenseQuery.Where(l => l.LicensePurchase != null && l.LicensePurchase.DepartmentId == request.DepartmentId.Value);
        }

        var purchaseQuery = _context.PurchaseRequisitions
            .Include(p => p.Company)
            .Where(p => p.Status == "Approved");

        if (effectiveCompanyId.HasValue)
        {
            purchaseQuery = purchaseQuery.Where(p => p.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            purchaseQuery = purchaseQuery.Where(p => p.DepartmentId == request.DepartmentId.Value);
        }

        if (request.DateFrom.HasValue)
        {
            purchaseQuery = purchaseQuery.Where(p => p.ApprovedAt != null && p.ApprovedAt >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            purchaseQuery = purchaseQuery.Where(p => p.ApprovedAt != null && p.ApprovedAt <= request.DateTo.Value);
        }

        var assetTotal = await assetQuery.SumAsync(a => (decimal?)a.PurchaseCost) ?? 0m;
        var assetCount = await assetQuery.CountAsync();

        var linkedPurchaseIds = await licenseQuery
            .Where(l => l.LicensePurchaseId != null)
            .Select(l => l.LicensePurchaseId!.Value)
            .Distinct()
            .ToListAsync();

        var linkedCost = linkedPurchaseIds.Count == 0
            ? 0m
            : await _context.LicensePurchases
                .Where(lp => linkedPurchaseIds.Contains(lp.Id))
                .SumAsync(lp => (decimal?)lp.Cost) ?? 0m;

        var unlinkedCost = await licenseQuery
            .Where(l => l.LicensePurchaseId == null)
            .SumAsync(l => (decimal?)l.PurchaseCost) ?? 0m;

        var licenseTotal = linkedCost + unlinkedCost;
        var licenseCount = await licenseQuery.CountAsync();

        var purchaseTotal = await purchaseQuery.SumAsync(p => (decimal?)p.TotalAmount) ?? 0m;
        var purchaseCount = await purchaseQuery.CountAsync();

        var assetBreakdownRows = await assetQuery
            .Select(a => new
            {
                EntityName = a.Department != null && a.Department.Company != null
                    ? a.Department.Company.Name
                    : "(No Entity)",
                DepartmentName = a.Department != null ? a.Department.DepartmentName : "(No Department)",
                Cost = a.PurchaseCost ?? 0m,
            })
            .ToListAsync();

        var licensePurchaseQuery = _context.LicensePurchases
            .Include(lp => lp.Company)
            .Where(lp => lp.IsActive);

        if (effectiveCompanyId.HasValue)
        {
            licensePurchaseQuery = licensePurchaseQuery.Where(lp => lp.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            licensePurchaseQuery = licensePurchaseQuery.Where(lp => lp.DepartmentId == request.DepartmentId.Value);
        }

        var licenseBreakdownRows = await licensePurchaseQuery
            .Select(lp => new
            {
                EntityName = lp.Company != null ? lp.Company.Name : "(No Entity)",
                Cost = lp.Cost ?? 0m,
            })
            .ToListAsync();

        var byEntityRows = assetBreakdownRows
            .GroupBy(a => a.EntityName)
            .Select(g => new ItCostByEntityRow { EntityName = g.Key, AssetCost = g.Sum(x => x.Cost) })
            .ToList();

        foreach (var group in licenseBreakdownRows.GroupBy(l => l.EntityName))
        {
            var licenseCost = group.Sum(x => x.Cost);
            var existing = byEntityRows.FirstOrDefault(r => r.EntityName == group.Key);
            if (existing != null)
            {
                existing.LicenseCost = licenseCost;
            }
            else
            {
                byEntityRows.Add(new ItCostByEntityRow { EntityName = group.Key, LicenseCost = licenseCost });
            }
        }

        foreach (var row in byEntityRows)
        {
            row.TotalCost = row.AssetCost + row.LicenseCost;
        }

        var byDepartmentRows = assetBreakdownRows
            .GroupBy(a => new { a.DepartmentName, a.EntityName })
            .Select(g => new ItCostByDepartmentRow
            {
                DepartmentName = g.Key.DepartmentName,
                EntityName = g.Key.EntityName,
                AssetCost = g.Sum(x => x.Cost),
                TotalCost = g.Sum(x => x.Cost),
            })
            .OrderByDescending(r => r.TotalCost)
            .ToList();

        return new ItCostSummaryResponse
        {
            TotalAssetCost = assetTotal,
            TotalLicenseCost = licenseTotal,
            TotalApprovedPurchaseCost = purchaseTotal,
            GrandTotal = assetTotal + licenseTotal + purchaseTotal,
            AssetCount = assetCount,
            LicenseCount = licenseCount,
            ApprovedPurchaseCount = purchaseCount,
            ByEntity = byEntityRows.OrderByDescending(r => r.TotalCost).ToList(),
            ByDepartment = byDepartmentRows,
        };
    }

    // ==================== Step 7 Phase A: Warranty Expiry ====================

    private static readonly Expression<Func<Asset, WarrantyExpiryRow>> WarrantyExpiryProjection = a => new WarrantyExpiryRow
    {
        AssetTag = a.AssetTag,
        AssetName = a.AssetName,
        CompanyName = a.Department != null && a.Department.Company != null ? a.Department.Company.Name : null,
        DepartmentName = a.Department != null ? a.Department.DepartmentName : string.Empty,
        CurrentLocationName = a.CurrentLocation != null ? a.CurrentLocation.LocationName : null,
        WarrantyExpiry = a.WarrantyExpiry,
        Status = a.Status,
    };

    private IQueryable<Asset> BuildWarrantyExpiryBaseQuery(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        var effectiveCompanyId = ResolveEffectiveCompanyId(request, isRestricted, companyId);

        var query = _context.Assets
            .Include(a => a.Department).ThenInclude(d => d!.Company)
            .Include(a => a.CurrentLocation)
            .Where(a => a.IsActive && a.WarrantyExpiry != null);

        if (effectiveCompanyId.HasValue)
        {
            query = query.Where(a => a.Department != null && a.Department.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            query = query.Where(a => a.DepartmentId == request.DepartmentId.Value);
        }

        if (request.LocationId.HasValue)
        {
            query = query.Where(a => a.CurrentLocationId == request.LocationId.Value);
        }

        if (request.DateFrom.HasValue)
        {
            query = query.Where(a => a.WarrantyExpiry >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            query = query.Where(a => a.WarrantyExpiry <= request.DateTo.Value);
        }

        if (!request.DateFrom.HasValue && !request.DateTo.HasValue)
        {
            // Default window when no explicit range is given: already
            // expired, or expiring within the next 90 days.
            var cutoff = DateTime.UtcNow.Date.AddDays(90);
            query = query.Where(a => a.WarrantyExpiry <= cutoff);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(a => a.AssetTag.Contains(term) || a.AssetName.Contains(term));
        }

        return query;
    }

    // Date-difference/bucketing math runs here, after the rows are
    // materialized, rather than inside the SQL projection above - date
    // arithmetic inside an EF Core projection expression is a common
    // source of provider-translation failures, and there is no compiler
    // available in this workflow to catch one before it reaches the
    // server.
    private static void EnrichWarrantyExpiryRows(List<WarrantyExpiryRow> rows)
    {
        var today = DateTime.UtcNow.Date;

        foreach (var row in rows)
        {
            if (row.WarrantyExpiry == null)
            {
                continue;
            }

            var days = (row.WarrantyExpiry.Value.Date - today).Days;
            row.DaysUntilExpiry = days;
            row.WarrantyStatus = days < 0 ? "Expired" : "Expiring Soon";
        }
    }

    private static List<ExcelColumn<WarrantyExpiryRow>> WarrantyExpiryColumns() => new()
    {
        new() { Header = "Asset Tag", ValueSelector = r => r.AssetTag },
        new() { Header = "Asset Name", ValueSelector = r => r.AssetName },
        new() { Header = "Entity", ValueSelector = r => r.CompanyName },
        new() { Header = "Department", ValueSelector = r => r.DepartmentName },
        new() { Header = "Current Location", ValueSelector = r => r.CurrentLocationName },
        new() { Header = "Warranty Expiry", ValueSelector = r => r.WarrantyExpiry, Format = ExcelNumberFormat.Date },
        new() { Header = "Days Until Expiry", ValueSelector = r => r.DaysUntilExpiry, Format = ExcelNumberFormat.Number },
        new() { Header = "Warranty Status", ValueSelector = r => r.WarrantyStatus },
        new() { Header = "Asset Status", ValueSelector = r => r.Status },
    };

    public async Task<object> GetWarrantyExpiryPreviewAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        if (isRestricted && companyId == null)
        {
            return new PagedResponse<WarrantyExpiryRow>
            {
                Items = new List<WarrantyExpiryRow>(),
                Page = request.Page,
                PageSize = request.PageSize,
                TotalRecords = 0,
            };
        }

        var query = BuildWarrantyExpiryBaseQuery(request, isRestricted, companyId)
            .OrderBy(a => a.WarrantyExpiry)
            .Select(WarrantyExpiryProjection);

        var paged = await PaginateAndBuildAsync(query, request.Page, request.PageSize);
        EnrichWarrantyExpiryRows(paged.Items);

        return paged;
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> GetWarrantyExpiryExportAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId, ClaimsPrincipal user)
    {
        var meta = new ExcelWorkbookMeta
        {
            ReportTitle = "Warranty Expiry",
            GeneratedByUserName = ResolveUserName(user),
            GeneratedAtUtc = DateTime.UtcNow,
            AppliedFilters = await BuildAppliedFiltersAsync(request),
        };

        if (isRestricted && companyId == null)
        {
            var emptyBytes = _excelExportService.BuildWorkbook(meta, new List<WarrantyExpiryRow>(), WarrantyExpiryColumns());
            return (emptyBytes, XlsxContentType, BuildFileName("Warranty_Expiry"));
        }

        var baseQuery = BuildWarrantyExpiryBaseQuery(request, isRestricted, companyId);
        var totalCount = await baseQuery.CountAsync();
        if (totalCount > MaxExportRows)
        {
            throw new ReportExportTooLargeException(totalCount);
        }

        var rows = await baseQuery.OrderBy(a => a.WarrantyExpiry).Select(WarrantyExpiryProjection).ToListAsync();
        EnrichWarrantyExpiryRows(rows);
        meta.RecordCount = rows.Count;

        var bytes = _excelExportService.BuildWorkbook(meta, rows, WarrantyExpiryColumns());
        return (bytes, XlsxContentType, BuildFileName("Warranty_Expiry"));
    }

    // ==================== Step 7 Phase A: Asset Allocation ====================

    private static readonly Expression<Func<AssetAssignment, AssetAllocationRow>> AssetAllocationProjection = aa => new AssetAllocationRow
    {
        AssetTag = aa.Asset.AssetTag,
        AssetName = aa.Asset.AssetName,
        CompanyName = aa.Asset.Department != null && aa.Asset.Department.Company != null ? aa.Asset.Department.Company.Name : null,
        DepartmentName = aa.Asset.Department != null ? aa.Asset.Department.DepartmentName : string.Empty,
        AssignedToUserName = aa.User.FullName,
        AssignedToEmail = aa.User.Email,
        AssignmentType = aa.AssignmentType,
        WorkMode = aa.WorkMode,
        AssignedOn = aa.AssignedOn,
        ExpectedReturnDate = aa.ExpectedReturnDate,
        ReturnedOn = aa.ReturnedOn,
        Status = aa.Status,
        IsActive = aa.IsActive,
    };

    // No Location filter/column here - Asset.CurrentLocationId is only
    // populated once a Material Movement has completed for that asset
    // (see BuildAssetRegisterBaseQuery's own Location handling above),
    // which has no particular relationship to an assignment's start/end,
    // so a Location filter on this report would silently under-match
    // rather than mean anything reliable - documented omission, not a
    // missed field.
    private IQueryable<AssetAssignment> BuildAssetAllocationBaseQuery(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        var effectiveCompanyId = ResolveEffectiveCompanyId(request, isRestricted, companyId);

        var query = _context.AssetAssignments
            .Include(aa => aa.Asset).ThenInclude(a => a.Department).ThenInclude(d => d!.Company)
            .Include(aa => aa.User)
            .AsQueryable();

        if (effectiveCompanyId.HasValue)
        {
            query = query.Where(aa => aa.Asset.Department != null && aa.Asset.Department.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            query = query.Where(aa => aa.Asset.DepartmentId == request.DepartmentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            // "Active" is a synthetic status meaning "currently assigned"
            // (IsActive == true) - every other value matches
            // AssetAssignment.Status literally (e.g. "Assigned", "Returned").
            query = request.Status == "Active"
                ? query.Where(aa => aa.IsActive)
                : query.Where(aa => aa.Status == request.Status);
        }

        if (request.DateFrom.HasValue)
        {
            query = query.Where(aa => aa.AssignedOn >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            query = query.Where(aa => aa.AssignedOn <= request.DateTo.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(aa =>
                aa.Asset.AssetTag.Contains(term) ||
                aa.Asset.AssetName.Contains(term) ||
                aa.User.FullName.Contains(term));
        }

        return query;
    }

    private static List<ExcelColumn<AssetAllocationRow>> AssetAllocationColumns() => new()
    {
        new() { Header = "Asset Tag", ValueSelector = r => r.AssetTag },
        new() { Header = "Asset Name", ValueSelector = r => r.AssetName },
        new() { Header = "Entity", ValueSelector = r => r.CompanyName },
        new() { Header = "Department", ValueSelector = r => r.DepartmentName },
        new() { Header = "Assigned To", ValueSelector = r => r.AssignedToUserName },
        new() { Header = "Assigned To Email", ValueSelector = r => r.AssignedToEmail },
        new() { Header = "Assignment Type", ValueSelector = r => r.AssignmentType.ToString() },
        new() { Header = "Work Mode", ValueSelector = r => r.WorkMode },
        new() { Header = "Assigned On", ValueSelector = r => r.AssignedOn, Format = ExcelNumberFormat.Date },
        new() { Header = "Expected Return", ValueSelector = r => r.ExpectedReturnDate, Format = ExcelNumberFormat.Date },
        new() { Header = "Returned On", ValueSelector = r => r.ReturnedOn, Format = ExcelNumberFormat.Date },
        new() { Header = "Status", ValueSelector = r => r.Status },
    };

    public async Task<object> GetAssetAllocationPreviewAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        if (isRestricted && companyId == null)
        {
            return new PagedResponse<AssetAllocationRow>
            {
                Items = new List<AssetAllocationRow>(),
                Page = request.Page,
                PageSize = request.PageSize,
                TotalRecords = 0,
            };
        }

        var query = BuildAssetAllocationBaseQuery(request, isRestricted, companyId)
            .OrderByDescending(aa => aa.AssignedOn)
            .Select(AssetAllocationProjection);

        return await PaginateAndBuildAsync(query, request.Page, request.PageSize);
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> GetAssetAllocationExportAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId, ClaimsPrincipal user)
    {
        var meta = new ExcelWorkbookMeta
        {
            ReportTitle = "Asset Allocation",
            GeneratedByUserName = ResolveUserName(user),
            GeneratedAtUtc = DateTime.UtcNow,
            AppliedFilters = await BuildAppliedFiltersAsync(request),
        };

        if (isRestricted && companyId == null)
        {
            var emptyBytes = _excelExportService.BuildWorkbook(meta, new List<AssetAllocationRow>(), AssetAllocationColumns());
            return (emptyBytes, XlsxContentType, BuildFileName("Asset_Allocation"));
        }

        var baseQuery = BuildAssetAllocationBaseQuery(request, isRestricted, companyId);
        var totalCount = await baseQuery.CountAsync();
        if (totalCount > MaxExportRows)
        {
            throw new ReportExportTooLargeException(totalCount);
        }

        var rows = await baseQuery.OrderByDescending(aa => aa.AssignedOn).Select(AssetAllocationProjection).ToListAsync();
        meta.RecordCount = rows.Count;

        var bytes = _excelExportService.BuildWorkbook(meta, rows, AssetAllocationColumns());
        return (bytes, XlsxContentType, BuildFileName("Asset_Allocation"));
    }

    // ==================== Step 7 Phase A: Asset Ageing ====================

    private static readonly Expression<Func<Asset, AssetAgeingRow>> AssetAgeingProjection = a => new AssetAgeingRow
    {
        AssetTag = a.AssetTag,
        AssetName = a.AssetName,
        CompanyName = a.Department != null && a.Department.Company != null ? a.Department.Company.Name : null,
        DepartmentName = a.Department != null ? a.Department.DepartmentName : string.Empty,
        PurchaseDate = a.PurchaseDate,
        Status = a.Status,
    };

    private IQueryable<Asset> BuildAssetAgeingBaseQuery(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        var effectiveCompanyId = ResolveEffectiveCompanyId(request, isRestricted, companyId);

        var query = _context.Assets
            .Include(a => a.Department).ThenInclude(d => d!.Company)
            .Where(a => a.IsActive);

        if (effectiveCompanyId.HasValue)
        {
            query = query.Where(a => a.Department != null && a.Department.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            query = query.Where(a => a.DepartmentId == request.DepartmentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(a => a.Status == request.Status);
        }

        if (request.DateFrom.HasValue)
        {
            query = query.Where(a => a.PurchaseDate != null && a.PurchaseDate >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            query = query.Where(a => a.PurchaseDate != null && a.PurchaseDate <= request.DateTo.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(a => a.AssetTag.Contains(term) || a.AssetName.Contains(term));
        }

        return query;
    }

    private static void EnrichAssetAgeingRows(List<AssetAgeingRow> rows)
    {
        var today = DateTime.UtcNow.Date;

        foreach (var row in rows)
        {
            if (row.PurchaseDate == null)
            {
                row.AgeBucket = "Unknown";
                continue;
            }

            var years = (today - row.PurchaseDate.Value.Date).TotalDays / 365.25;
            row.AgeInYears = Math.Round(years, 1);
            row.AgeBucket = years switch
            {
                < 1 => "0-1 yr",
                < 3 => "1-3 yrs",
                < 5 => "3-5 yrs",
                _ => "5+ yrs",
            };
        }
    }

    private static List<ExcelColumn<AssetAgeingRow>> AssetAgeingColumns() => new()
    {
        new() { Header = "Asset Tag", ValueSelector = r => r.AssetTag },
        new() { Header = "Asset Name", ValueSelector = r => r.AssetName },
        new() { Header = "Entity", ValueSelector = r => r.CompanyName },
        new() { Header = "Department", ValueSelector = r => r.DepartmentName },
        new() { Header = "Purchase Date", ValueSelector = r => r.PurchaseDate, Format = ExcelNumberFormat.Date },
        new() { Header = "Age (Years)", ValueSelector = r => r.AgeInYears, Format = ExcelNumberFormat.Number },
        new() { Header = "Age Bucket", ValueSelector = r => r.AgeBucket },
        new() { Header = "Status", ValueSelector = r => r.Status },
    };

    public async Task<object> GetAssetAgeingPreviewAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        if (isRestricted && companyId == null)
        {
            return new PagedResponse<AssetAgeingRow>
            {
                Items = new List<AssetAgeingRow>(),
                Page = request.Page,
                PageSize = request.PageSize,
                TotalRecords = 0,
            };
        }

        var query = BuildAssetAgeingBaseQuery(request, isRestricted, companyId)
            .OrderBy(a => a.PurchaseDate)
            .Select(AssetAgeingProjection);

        var paged = await PaginateAndBuildAsync(query, request.Page, request.PageSize);
        EnrichAssetAgeingRows(paged.Items);

        return paged;
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> GetAssetAgeingExportAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId, ClaimsPrincipal user)
    {
        var meta = new ExcelWorkbookMeta
        {
            ReportTitle = "Asset Ageing",
            GeneratedByUserName = ResolveUserName(user),
            GeneratedAtUtc = DateTime.UtcNow,
            AppliedFilters = await BuildAppliedFiltersAsync(request),
        };

        if (isRestricted && companyId == null)
        {
            var emptyBytes = _excelExportService.BuildWorkbook(meta, new List<AssetAgeingRow>(), AssetAgeingColumns());
            return (emptyBytes, XlsxContentType, BuildFileName("Asset_Ageing"));
        }

        var baseQuery = BuildAssetAgeingBaseQuery(request, isRestricted, companyId);
        var totalCount = await baseQuery.CountAsync();
        if (totalCount > MaxExportRows)
        {
            throw new ReportExportTooLargeException(totalCount);
        }

        var rows = await baseQuery.OrderBy(a => a.PurchaseDate).Select(AssetAgeingProjection).ToListAsync();
        EnrichAssetAgeingRows(rows);
        meta.RecordCount = rows.Count;

        var bytes = _excelExportService.BuildWorkbook(meta, rows, AssetAgeingColumns());
        return (bytes, XlsxContentType, BuildFileName("Asset_Ageing"));
    }

    // ==================== Step 7 Phase A: Data Quality ====================
    // Restricted to Super Admin/IT Admin only via ReportDefinition.RequiredRoles
    // (see ReportCatalog.cs) - checked in ReportCenterController before either
    // method below is ever called.

    public async Task<object> GetDataQualityPreviewAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        if (isRestricted && companyId == null)
        {
            return new PagedResponse<DataQualityIssueRow>
            {
                Items = new List<DataQualityIssueRow>(),
                Page = request.Page,
                PageSize = request.PageSize,
                TotalRecords = 0,
            };
        }

        var issues = await BuildDataQualityIssuesAsync(request, isRestricted, companyId);

        var pageItems = issues
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToList();

        return new PagedResponse<DataQualityIssueRow>
        {
            Items = pageItems,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalRecords = issues.Count,
        };
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> GetDataQualityExportAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId, ClaimsPrincipal user)
    {
        var meta = new ExcelWorkbookMeta
        {
            ReportTitle = "Data Quality",
            GeneratedByUserName = ResolveUserName(user),
            GeneratedAtUtc = DateTime.UtcNow,
            AppliedFilters = await BuildAppliedFiltersAsync(request),
        };

        if (isRestricted && companyId == null)
        {
            var emptyBytes = _excelExportService.BuildWorkbook(meta, new List<DataQualityIssueRow>(), DataQualityColumns());
            return (emptyBytes, XlsxContentType, BuildFileName("Data_Quality"));
        }

        var issues = await BuildDataQualityIssuesAsync(request, isRestricted, companyId);
        if (issues.Count > MaxExportRows)
        {
            throw new ReportExportTooLargeException(issues.Count);
        }

        meta.RecordCount = issues.Count;

        var bytes = _excelExportService.BuildWorkbook(meta, issues, DataQualityColumns());
        return (bytes, XlsxContentType, BuildFileName("Data_Quality"));
    }

    // Scans Assets, Licenses, and LicensePurchases for a handful of
    // concrete, objectively-checkable integrity problems - never a
    // subjective/invented rule. Each candidate set is filtered by
    // Entity/Department at the SQL level before being pulled into memory,
    // so only the (small) set of already-flagged rows is ever
    // materialized client-side. Results are paginated in memory (see
    // GetDataQualityPreviewAsync) rather than via PaginateAndBuildAsync's
    // IQueryable pattern, since the candidates come from three
    // differently-shaped queries merged in C# - matching the one other
    // intentional in-memory-pagination exception already used in this
    // catalog (the Purchase-to-Asset & License Mapping report).
    private async Task<List<DataQualityIssueRow>> BuildDataQualityIssuesAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        var effectiveCompanyId = ResolveEffectiveCompanyId(request, isRestricted, companyId);
        var issues = new List<DataQualityIssueRow>();

        var assetQuery = _context.Assets
            .Include(a => a.Department).ThenInclude(d => d!.Company)
            .Where(a => a.IsActive);

        if (effectiveCompanyId.HasValue)
        {
            assetQuery = assetQuery.Where(a => a.Department != null && a.Department.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            assetQuery = assetQuery.Where(a => a.DepartmentId == request.DepartmentId.Value);
        }

        var assetsMissingSerial = await assetQuery
            .Where(a => string.IsNullOrEmpty(a.SerialNumber))
            .Select(a => new
            {
                a.AssetTag,
                CompanyName = a.Department != null && a.Department.Company != null ? a.Department.Company.Name : null,
                DepartmentName = a.Department != null ? a.Department.DepartmentName : null,
            })
            .ToListAsync();

        issues.AddRange(assetsMissingSerial.Select(a => new DataQualityIssueRow
        {
            EntityType = "Asset",
            RecordIdentifier = a.AssetTag,
            CompanyName = a.CompanyName,
            DepartmentName = a.DepartmentName,
            IssueDescription = "Missing serial number.",
            Severity = "Medium",
        }));

        var assetsAssignedWithoutActiveAssignment = await assetQuery
            .Where(a => a.Status == "Assigned" && !_context.AssetAssignments.Any(aa => aa.AssetId == a.Id && aa.IsActive))
            .Select(a => new
            {
                a.AssetTag,
                CompanyName = a.Department != null && a.Department.Company != null ? a.Department.Company.Name : null,
                DepartmentName = a.Department != null ? a.Department.DepartmentName : null,
            })
            .ToListAsync();

        issues.AddRange(assetsAssignedWithoutActiveAssignment.Select(a => new DataQualityIssueRow
        {
            EntityType = "Asset",
            RecordIdentifier = a.AssetTag,
            CompanyName = a.CompanyName,
            DepartmentName = a.DepartmentName,
            IssueDescription = "Status is 'Assigned' but no active assignment record exists.",
            Severity = "High",
        }));

        var licenseQuery = _context.Licenses
            .Include(l => l.LicensePurchase).ThenInclude(lp => lp!.Company)
            .Include(l => l.LicensePurchase).ThenInclude(lp => lp!.Department)
            .Where(l => l.IsActive);

        if (effectiveCompanyId.HasValue)
        {
            licenseQuery = licenseQuery.Where(l => l.LicensePurchase != null && l.LicensePurchase.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            licenseQuery = licenseQuery.Where(l => l.LicensePurchase != null && l.LicensePurchase.DepartmentId == request.DepartmentId.Value);
        }

        var licensesMissingEmail = await licenseQuery
            .Where(l => string.IsNullOrEmpty(l.LicensedEmail))
            .Select(l => new
            {
                l.AliasCode,
                CompanyName = l.LicensePurchase != null && l.LicensePurchase.Company != null ? l.LicensePurchase.Company.Name : null,
                DepartmentName = l.LicensePurchase != null && l.LicensePurchase.Department != null ? l.LicensePurchase.Department.DepartmentName : null,
            })
            .ToListAsync();

        issues.AddRange(licensesMissingEmail.Select(l => new DataQualityIssueRow
        {
            EntityType = "License",
            RecordIdentifier = l.AliasCode,
            CompanyName = l.CompanyName,
            DepartmentName = l.DepartmentName,
            IssueDescription = "Missing licensed email.",
            Severity = "Medium",
        }));

        var today = DateTime.UtcNow.Date;
        var licensesExpiredButNotFlagged = await licenseQuery
            .Where(l => l.ExpiryDate < today && l.Status != "Expired")
            .Select(l => new
            {
                l.AliasCode,
                CompanyName = l.LicensePurchase != null && l.LicensePurchase.Company != null ? l.LicensePurchase.Company.Name : null,
                DepartmentName = l.LicensePurchase != null && l.LicensePurchase.Department != null ? l.LicensePurchase.Department.DepartmentName : null,
            })
            .ToListAsync();

        issues.AddRange(licensesExpiredButNotFlagged.Select(l => new DataQualityIssueRow
        {
            EntityType = "License",
            RecordIdentifier = l.AliasCode,
            CompanyName = l.CompanyName,
            DepartmentName = l.DepartmentName,
            IssueDescription = "Expiry date has passed but Status is not 'Expired'.",
            Severity = "High",
        }));

        var licensePurchaseQuery = _context.LicensePurchases
            .Include(lp => lp.Company)
            .Include(lp => lp.Department)
            .Where(lp => lp.IsActive);

        if (effectiveCompanyId.HasValue)
        {
            licensePurchaseQuery = licensePurchaseQuery.Where(lp => lp.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            licensePurchaseQuery = licensePurchaseQuery.Where(lp => lp.DepartmentId == request.DepartmentId.Value);
        }

        // PONumber/Id are projected as raw fields and combined into
        // RecordIdentifier afterward in C#, not via string concatenation
        // inside the SQL projection - int-to-text concatenation inside an
        // EF Core Select is a plausible provider-translation failure
        // point, and there is no compiler available here to catch one.
        var purchasesMissingVendor = await licensePurchaseQuery
            .Where(lp => string.IsNullOrEmpty(lp.Vendor))
            .Select(lp => new
            {
                lp.Id,
                lp.PONumber,
                CompanyName = lp.Company != null ? lp.Company.Name : null,
                DepartmentName = lp.Department != null ? lp.Department.DepartmentName : null,
            })
            .ToListAsync();

        issues.AddRange(purchasesMissingVendor.Select(lp => new DataQualityIssueRow
        {
            EntityType = "License Purchase",
            RecordIdentifier = lp.PONumber ?? $"#{lp.Id}",
            CompanyName = lp.CompanyName,
            DepartmentName = lp.DepartmentName,
            IssueDescription = "Missing vendor.",
            Severity = "Medium",
        }));

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            issues = issues
                .Where(i => i.RecordIdentifier.Contains(term, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return issues
            .OrderBy(i => i.EntityType)
            .ThenByDescending(i => i.Severity == "High")
            .ThenBy(i => i.RecordIdentifier)
            .ToList();
    }

    private static List<ExcelColumn<DataQualityIssueRow>> DataQualityColumns() => new()
    {
        new() { Header = "Entity Type", ValueSelector = r => r.EntityType },
        new() { Header = "Record", ValueSelector = r => r.RecordIdentifier },
        new() { Header = "Entity", ValueSelector = r => r.CompanyName },
        new() { Header = "Department", ValueSelector = r => r.DepartmentName },
        new() { Header = "Issue", ValueSelector = r => r.IssueDescription },
        new() { Header = "Severity", ValueSelector = r => r.Severity },
    };

    // ==================== License Purchases by Client ====================
    //
    // Grain: LicensePurchase rows with a Client set (ClientId != null).
    // Covers both scenarios the business described: PurchasedByType ==
    // "Entity" (PPS purchased the license itself, but it's scoped to this
    // client's project - an internal Company is also set) and
    // PurchasedByType == "Client" (the client supplies/holds the license
    // themselves; this row exists purely to track its cost against that
    // client's project). PurchasedByLabel is a display-only enrichment
    // computed in C# after materialization, not in the LINQ projection -
    // it's a plain string-equality ternary either way, but this keeps the
    // same "no derived logic inside .Select()" discipline used everywhere
    // else in this file.

    private static readonly Expression<Func<LicensePurchase, ClientLicensePurchaseRow>> ClientLicensePurchaseProjection = lp => new ClientLicensePurchaseRow
    {
        Id = lp.Id,
        ClientName = lp.Client != null ? lp.Client.Name : string.Empty,
        PurchasedByType = lp.PurchasedByType,
        CompanyName = lp.Company != null ? lp.Company.Name : null,
        DepartmentName = lp.Department != null ? lp.Department.DepartmentName : null,
        SoftwareName = lp.Software.Name,
        Vendor = lp.Vendor,
        LicenseType = lp.LicenseType,
        TotalLicenses = lp.TotalLicenses,
        PurchaseDate = lp.PurchaseDate,
        ExpiryDate = lp.ExpiryDate,
        Cost = lp.Cost,
        Currency = lp.Currency,
        PONumber = lp.PONumber,
        InvoiceNumber = lp.InvoiceNumber,
        Remarks = lp.Remarks,
    };

    private IQueryable<LicensePurchase> BuildClientLicensePurchaseBaseQuery(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        var effectiveCompanyId = ResolveEffectiveCompanyId(request, isRestricted, companyId);

        var query = _context.LicensePurchases
            .Include(lp => lp.Client)
            .Include(lp => lp.Company)
            .Include(lp => lp.Department)
            .Include(lp => lp.Software)
            .Where(lp => lp.IsActive && lp.ClientId != null);

        if (effectiveCompanyId.HasValue)
        {
            query = query.Where(lp => lp.CompanyId == effectiveCompanyId.Value);
        }

        if (request.ClientId.HasValue)
        {
            query = query.Where(lp => lp.ClientId == request.ClientId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            query = query.Where(lp => lp.DepartmentId == request.DepartmentId.Value);
        }

        if (request.SoftwareId.HasValue)
        {
            query = query.Where(lp => lp.SoftwareId == request.SoftwareId.Value);
        }

        // Status is reused here for PurchasedByType ("Entity" | "Client")
        // rather than a free-text status, matching how other reports on
        // this shared request repurpose the Status field for their own
        // domain (see Services/ReportCenter/ReportQueryRequest.cs's own
        // comment on that field).
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(lp => lp.PurchasedByType == request.Status);
        }

        // LicensePurchase.PurchaseDate is DateOnly, not DateTime like
        // Asset.PurchaseDate/License.PurchaseDate elsewhere in this file -
        // convert once here rather than comparing mismatched types.
        if (request.DateFrom.HasValue)
        {
            var from = DateOnly.FromDateTime(request.DateFrom.Value);
            query = query.Where(lp => lp.PurchaseDate >= from);
        }

        if (request.DateTo.HasValue)
        {
            var to = DateOnly.FromDateTime(request.DateTo.Value);
            query = query.Where(lp => lp.PurchaseDate <= to);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(lp =>
                (lp.Client != null && lp.Client.Name.Contains(term)) ||
                lp.Software.Name.Contains(term) ||
                lp.Vendor.Contains(term) ||
                (lp.PONumber != null && lp.PONumber.Contains(term)) ||
                (lp.InvoiceNumber != null && lp.InvoiceNumber.Contains(term)));
        }

        return query;
    }

    private static void EnrichClientLicensePurchaseRows(List<ClientLicensePurchaseRow> rows)
    {
        foreach (var row in rows)
        {
            row.PurchasedByLabel = row.PurchasedByType == "Client"
                ? "Client-Provided"
                : "Purchased by PPS";
        }
    }

    private static List<ExcelColumn<ClientLicensePurchaseRow>> ClientLicensePurchaseColumns() => new()
    {
        new() { Header = "Client", ValueSelector = r => r.ClientName },
        new() { Header = "Purchased By", ValueSelector = r => r.PurchasedByLabel },
        new() { Header = "Entity", ValueSelector = r => r.CompanyName },
        new() { Header = "Department", ValueSelector = r => r.DepartmentName },
        new() { Header = "Software", ValueSelector = r => r.SoftwareName },
        new() { Header = "Vendor", ValueSelector = r => r.Vendor },
        new() { Header = "License Type", ValueSelector = r => r.LicenseType },
        new() { Header = "Total Licenses", ValueSelector = r => r.TotalLicenses, Format = ExcelNumberFormat.Number },
        new() { Header = "Purchase Date", ValueSelector = r => r.PurchaseDate, Format = ExcelNumberFormat.Date },
        new() { Header = "Expiry Date", ValueSelector = r => r.ExpiryDate, Format = ExcelNumberFormat.Date },
        new() { Header = "Cost", ValueSelector = r => r.Cost, Format = ExcelNumberFormat.Currency },
        new() { Header = "Currency", ValueSelector = r => r.Currency },
        new() { Header = "PO Number", ValueSelector = r => r.PONumber },
        new() { Header = "Invoice Number", ValueSelector = r => r.InvoiceNumber },
        new() { Header = "Remarks", ValueSelector = r => r.Remarks },
    };

    public async Task<object> GetClientLicensePurchasePreviewAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        if (isRestricted && companyId == null)
        {
            return new PagedResponse<ClientLicensePurchaseRow>
            {
                Items = new List<ClientLicensePurchaseRow>(),
                Page = request.Page,
                PageSize = request.PageSize,
                TotalRecords = 0,
            };
        }

        var query = BuildClientLicensePurchaseBaseQuery(request, isRestricted, companyId)
            .OrderBy(lp => lp.Client!.Name).ThenByDescending(lp => lp.PurchaseDate)
            .Select(ClientLicensePurchaseProjection);

        var paged = await PaginateAndBuildAsync(query, request.Page, request.PageSize);
        EnrichClientLicensePurchaseRows(paged.Items);

        return paged;
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> GetClientLicensePurchaseExportAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId, ClaimsPrincipal user)
    {
        var meta = new ExcelWorkbookMeta
        {
            ReportTitle = "License Purchases by Client",
            GeneratedByUserName = ResolveUserName(user),
            GeneratedAtUtc = DateTime.UtcNow,
            AppliedFilters = await BuildAppliedFiltersAsync(request),
        };

        if (isRestricted && companyId == null)
        {
            var emptyBytes = _excelExportService.BuildWorkbook(meta, new List<ClientLicensePurchaseRow>(), ClientLicensePurchaseColumns());
            return (emptyBytes, XlsxContentType, BuildFileName("License_Purchases_By_Client"));
        }

        var baseQuery = BuildClientLicensePurchaseBaseQuery(request, isRestricted, companyId);
        var totalCount = await baseQuery.CountAsync();
        if (totalCount > MaxExportRows)
        {
            throw new ReportExportTooLargeException(totalCount);
        }

        var rows = await baseQuery
            .OrderBy(lp => lp.Client!.Name).ThenByDescending(lp => lp.PurchaseDate)
            .Select(ClientLicensePurchaseProjection)
            .ToListAsync();
        EnrichClientLicensePurchaseRows(rows);
        meta.RecordCount = rows.Count;

        var breakdownSheets = new List<ExcelBreakdownSheet>
        {
            new()
            {
                SheetName = "By Client",
                Headers = new List<string> { "Client", "Purchases", "Purchased by PPS (Cost)", "Client-Provided (Cost)", "Total Cost" },
                Rows = rows
                    .GroupBy(r => r.ClientName)
                    .Select(g => new object?[]
                    {
                        g.Key,
                        g.Count(),
                        g.Where(r => r.PurchasedByType != "Client").Sum(r => r.Cost ?? 0m),
                        g.Where(r => r.PurchasedByType == "Client").Sum(r => r.Cost ?? 0m),
                        g.Sum(r => r.Cost ?? 0m),
                    })
                    .OrderByDescending(r => (decimal)r[4]!)
                    .ToList(),
            },
        };

        var bytes = _excelExportService.BuildWorkbook(meta, rows, ClientLicensePurchaseColumns(), breakdownSheets);
        return (bytes, XlsxContentType, BuildFileName("License_Purchases_By_Client"));
    }
}
