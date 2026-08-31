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

    public static ReportQueryRequest Clone(ReportQueryRequest request)
    {
        return new ReportQueryRequest
        {
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            LocationId = request.LocationId,
            DateFrom = request.DateFrom,
            DateTo = request.DateTo,
            Status = request.Status,
            Search = request.Search,
            VendorId = request.VendorId,
            SoftwareId = request.SoftwareId,
            ClientId = request.ClientId,
            AssetType = request.AssetType,
            MovementType = request.MovementType,
            GroupBy = request.GroupBy,
            Page = request.Page,
            PageSize = request.PageSize,
            SortBy = request.SortBy,
            SortDirection = request.SortDirection,
        };
    }

    public static ReportQueryRequest WithForcedStatus(ReportQueryRequest request, string status)
    {
        var clone = Clone(request);
        clone.Status = status;
        return clone;
    }

    public static ReportQueryRequest WithForcedMovementType(ReportQueryRequest request, string movementType)
    {
        var clone = Clone(request);
        clone.MovementType = movementType;
        return clone;
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

        if (request.ClientId.HasValue)
        {
            var name = await _context.Clients
                .Where(c => c.Id == request.ClientId.Value)
                .Select(c => c.Name)
                .FirstOrDefaultAsync();
            entries.Add(new AppliedFilterEntry { Label = "Client", Value = name ?? $"#{request.ClientId}" });
        }

        if (!string.IsNullOrWhiteSpace(request.MovementType))
        {
            entries.Add(new AppliedFilterEntry { Label = "Movement Type", Value = request.MovementType });
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

    public static readonly string[] InwardMovementTypes =
        { "InwardFromVendor", "DirectInward" };

    public static readonly string[] OutwardMovementTypes =
        { "OutwardToVendor", "DirectOutward" };

    private static readonly Expression<Func<License, ClientLicenseRegisterRow>> ClientLicenseProjection = l => new ClientLicenseRegisterRow
    {
        ClientName = l.LicensePurchase != null && l.LicensePurchase.Client != null
            ? l.LicensePurchase.Client.Name
            : string.Empty,
        ClientCode = l.LicensePurchase != null && l.LicensePurchase.Client != null
            ? l.LicensePurchase.Client.Code
            : string.Empty,
        AliasCode = l.AliasCode,
        SoftwareName = l.Software.Name,
        LicensedEmail = l.LicensedEmail,
        Vendor = l.LicensePurchase != null ? l.LicensePurchase.Vendor : null,
        CompanyName = l.LicensePurchase != null && l.LicensePurchase.Company != null
            ? l.LicensePurchase.Company.Name
            : null,
        DepartmentName = l.LicensePurchase != null && l.LicensePurchase.Department != null
            ? l.LicensePurchase.Department.DepartmentName
            : null,
        Status = l.Status,
        PurchaseDate = l.PurchaseDate,
        ExpiryDate = l.ExpiryDate,
        PurchaseCost = l.PurchaseCost,
    };

    private IQueryable<License> BuildClientLicenseBaseQuery(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        var query = BuildLicenseRegisterBaseQuery(request, isRestricted, companyId)
            .Where(l => l.LicensePurchase != null && l.LicensePurchase.ClientId != null);

        if (request.ClientId.HasValue)
        {
            query = query.Where(l => l.LicensePurchase != null && l.LicensePurchase.ClientId == request.ClientId.Value);
        }

        return query;
    }

    private static List<ExcelColumn<ClientLicenseRegisterRow>> ClientLicenseColumns() => new()
    {
        new() { Header = "Client", ValueSelector = r => r.ClientName },
        new() { Header = "Client Code", ValueSelector = r => r.ClientCode },
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

    public async Task<object> GetClientLicenseRegisterPreviewAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        if (isRestricted && companyId == null)
        {
            return new PagedResponse<ClientLicenseRegisterRow>
            {
                Items = new List<ClientLicenseRegisterRow>(),
                Page = request.Page,
                PageSize = request.PageSize,
                TotalRecords = 0,
            };
        }

        var query = BuildClientLicenseBaseQuery(request, isRestricted, companyId)
            .OrderBy(l => l.LicensePurchase!.Client!.Name)
            .ThenBy(l => l.AliasCode)
            .Select(ClientLicenseProjection);

        return await PaginateAndBuildAsync(query, request.Page, request.PageSize);
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> GetClientLicenseRegisterExportAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId, ClaimsPrincipal user)
    {
        var meta = new ExcelWorkbookMeta
        {
            ReportTitle = "Client License Register",
            GeneratedByUserName = ResolveUserName(user),
            GeneratedAtUtc = DateTime.UtcNow,
            AppliedFilters = await BuildAppliedFiltersAsync(request),
        };

        if (isRestricted && companyId == null)
        {
            var emptyBytes = _excelExportService.BuildWorkbook(
                meta, new List<ClientLicenseRegisterRow>(), ClientLicenseColumns());
            return (emptyBytes, XlsxContentType, BuildFileName("Client_License_Register"));
        }

        var baseQuery = BuildClientLicenseBaseQuery(request, isRestricted, companyId);
        var totalCount = await baseQuery.CountAsync();
        if (totalCount > MaxExportRows)
        {
            throw new ReportExportTooLargeException(totalCount);
        }

        var rows = await baseQuery
            .OrderBy(l => l.LicensePurchase!.Client!.Name)
            .ThenBy(l => l.AliasCode)
            .Select(ClientLicenseProjection)
            .ToListAsync();
        meta.RecordCount = rows.Count;

        var bytes = _excelExportService.BuildWorkbook(meta, rows, ClientLicenseColumns());
        return (bytes, XlsxContentType, BuildFileName("Client_License_Register"));
    }

    public async Task<object> GetClientCostSummaryPreviewAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        var rows = await BuildClientCostSummaryRowsAsync(request, isRestricted, companyId);
        return new PagedResponse<ClientCostSummaryRow>
        {
            Items = rows
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToList(),
            Page = request.Page,
            PageSize = request.PageSize,
            TotalRecords = rows.Count,
        };
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> GetClientCostSummaryExportAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId, ClaimsPrincipal user)
    {
        var rows = await BuildClientCostSummaryRowsAsync(request, isRestricted, companyId);

        var meta = new ExcelWorkbookMeta
        {
            ReportTitle = "Client Cost Summary",
            GeneratedByUserName = ResolveUserName(user),
            GeneratedAtUtc = DateTime.UtcNow,
            AppliedFilters = await BuildAppliedFiltersAsync(request),
            RecordCount = rows.Count,
        };

        var bytes = _excelExportService.BuildWorkbook(meta, rows, ClientCostColumns());
        return (bytes, XlsxContentType, BuildFileName("Client_Cost_Summary"));
    }

    private static List<ExcelColumn<ClientCostSummaryRow>> ClientCostColumns() => new()
    {
        new() { Header = "Client", ValueSelector = r => r.ClientName },
        new() { Header = "Client Code", ValueSelector = r => r.ClientCode },
        new() { Header = "Software Titles", ValueSelector = r => r.SoftwareTitles, Format = ExcelNumberFormat.Number },
        new() { Header = "Purchases", ValueSelector = r => r.PurchaseCount, Format = ExcelNumberFormat.Number },
        new() { Header = "Pool Seats", ValueSelector = r => r.TotalSeats, Format = ExcelNumberFormat.Number },
        new() { Header = "Licenses", ValueSelector = r => r.LicenseCount, Format = ExcelNumberFormat.Number },
        new() { Header = "Allocated Seats", ValueSelector = r => r.AllocatedSeats, Format = ExcelNumberFormat.Number },
        new() { Header = "Total Cost", ValueSelector = r => r.TotalCost, Format = ExcelNumberFormat.Currency },
    };

    private async Task<List<ClientCostSummaryRow>> BuildClientCostSummaryRowsAsync(
        ReportQueryRequest request, bool isRestricted, int? companyId)
    {
        if (isRestricted && companyId == null)
        {
            return new List<ClientCostSummaryRow>();
        }

        var effectiveCompanyId = ResolveEffectiveCompanyId(request, isRestricted, companyId);

        var purchaseQuery = _context.LicensePurchases
            .Include(lp => lp.Client)
            .Where(lp => lp.IsActive && lp.ClientId != null);

        if (effectiveCompanyId.HasValue)
        {
            purchaseQuery = purchaseQuery.Where(lp => lp.CompanyId == effectiveCompanyId.Value);
        }

        if (request.DepartmentId.HasValue)
        {
            purchaseQuery = purchaseQuery.Where(lp => lp.DepartmentId == request.DepartmentId.Value);
        }

        if (request.ClientId.HasValue)
        {
            purchaseQuery = purchaseQuery.Where(lp => lp.ClientId == request.ClientId.Value);
        }

        if (request.DateFrom.HasValue)
        {
            var from = DateOnly.FromDateTime(request.DateFrom.Value);
            purchaseQuery = purchaseQuery.Where(lp => lp.PurchaseDate >= from);
        }

        if (request.DateTo.HasValue)
        {
            var to = DateOnly.FromDateTime(request.DateTo.Value);
            purchaseQuery = purchaseQuery.Where(lp => lp.PurchaseDate <= to);
        }

        var purchaseRows = await purchaseQuery
            .GroupBy(lp => new
            {
                ClientId = lp.ClientId!.Value,
                ClientName = lp.Client!.Name,
                ClientCode = lp.Client.Code,
            })
            .Select(g => new
            {
                g.Key.ClientId,
                g.Key.ClientName,
                g.Key.ClientCode,
                SoftwareTitles = g.Select(x => x.SoftwareId).Distinct().Count(),
                PurchaseCount = g.Count(),
                TotalSeats = g.Sum(x => x.TotalLicenses),
                TotalCost = g.Sum(x => x.Cost ?? 0m),
            })
            .ToListAsync();

        var clientIds = purchaseRows.Select(r => r.ClientId).ToList();

        var licenseCounts = clientIds.Count == 0
            ? new Dictionary<int, int>()
            : await _context.Licenses
                .Where(l => l.IsActive
                    && l.LicensePurchase != null
                    && l.LicensePurchase.ClientId != null
                    && clientIds.Contains(l.LicensePurchase.ClientId.Value))
                .GroupBy(l => l.LicensePurchase!.ClientId!.Value)
                .Select(g => new { ClientId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ClientId, x => x.Count);

        var allocatedCounts = clientIds.Count == 0
            ? new Dictionary<int, int>()
            : await _context.ResourceAllocations
                .Where(a => a.IsActive
                    && a.Status == "Allocated"
                    && a.License.LicensePurchase != null
                    && a.License.LicensePurchase.ClientId != null
                    && clientIds.Contains(a.License.LicensePurchase.ClientId.Value))
                .GroupBy(a => a.License.LicensePurchase!.ClientId!.Value)
                .Select(g => new { ClientId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ClientId, x => x.Count);

        return purchaseRows
            .Select(row => new ClientCostSummaryRow
            {
                ClientName = row.ClientName,
                ClientCode = row.ClientCode,
                SoftwareTitles = row.SoftwareTitles,
                PurchaseCount = row.PurchaseCount,
                TotalSeats = row.TotalSeats,
                LicenseCount = licenseCounts.GetValueOrDefault(row.ClientId),
                AllocatedSeats = allocatedCounts.GetValueOrDefault(row.ClientId),
                TotalCost = row.TotalCost,
            })
            .OrderByDescending(r => r.TotalCost)
            .ThenBy(r => r.ClientName)
            .ToList();
    }

    private IQueryable<MaterialMovementRow> BuildMaterialMovementRowQuery(
        ReportQueryRequest request,
        bool isRestricted,
        int? companyId,
        string[]? forcedTypes)
    {
        var effectiveCompanyId = ResolveEffectiveCompanyId(request, isRestricted, companyId);

        var movements = _context.MaterialMovements.AsQueryable();

        if (effectiveCompanyId.HasValue)
        {
            var id = effectiveCompanyId.Value;
            movements = movements.Where(m => m.FromCompanyId == id || m.ToCompanyId == id);
        }

        if (request.DepartmentId.HasValue)
        {
            var departmentId = request.DepartmentId.Value;
            movements = movements.Where(m =>
                m.FromDepartmentId == departmentId || m.ToDepartmentId == departmentId);
        }

        if (request.LocationId.HasValue)
        {
            var locationId = request.LocationId.Value;
            movements = movements.Where(m =>
                m.FromLocationId == locationId || m.ToLocationId == locationId);
        }

        if (request.VendorId.HasValue)
        {
            movements = movements.Where(m => m.VendorId == request.VendorId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            movements = movements.Where(m => m.Status == request.Status);
        }

        if (forcedTypes is { Length: > 0 })
        {
            movements = movements.Where(m => forcedTypes.Contains(m.MovementType));
        }
        else if (!string.IsNullOrWhiteSpace(request.MovementType))
        {
            movements = movements.Where(m => m.MovementType == request.MovementType);
        }

        if (request.DateFrom.HasValue)
        {
            movements = movements.Where(m => m.RequestedAt >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            var endExclusive = request.DateTo.Value.Date.AddDays(1);
            movements = movements.Where(m => m.RequestedAt < endExclusive);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            movements = movements.Where(m =>
                (m.MovementNumber != null && m.MovementNumber.Contains(term))
                || (m.Purpose != null && m.Purpose.Contains(term)));
        }

        return
            from m in movements
            join item in _context.MaterialMovementItems on m.Id equals item.MovementId into itemGroup
            from item in itemGroup.DefaultIfEmpty()
            select new MaterialMovementRow
            {
                MovementNumber = m.MovementNumber,
                MovementType = m.MovementType,
                Status = m.Status,
                FromCompanyName = m.FromCompany != null ? m.FromCompany.Name : null,
                FromLocationName = m.FromLocation != null ? m.FromLocation.LocationName : null,
                FromDepartmentName = m.FromDepartment != null ? m.FromDepartment.DepartmentName : null,
                ToCompanyName = m.ToCompany != null ? m.ToCompany.Name : null,
                ToLocationName = m.ToLocation != null ? m.ToLocation.LocationName : null,
                ToDepartmentName = m.ToDepartment != null ? m.ToDepartment.DepartmentName : null,
                VendorName = m.Vendor != null ? m.Vendor.VendorName : null,
                ItemCode = item != null ? item.Item.ItemCode : null,
                ItemName = item != null ? item.Item.ItemName : null,
                MaterialType = item != null ? item.Item.MaterialType : null,
                AssetTag = item != null && item.Asset != null ? item.Asset.AssetTag : null,
                Quantity = item != null ? item.Quantity : null,
                UnitOfMeasure = item != null ? item.UnitOfMeasure : null,
                SerialNumbers = item != null ? item.SerialNumbers : null,
                Condition = item != null ? item.Condition : null,
                RequestedByUserName = m.RequestedByUser.FullName,
                RequestedAt = m.RequestedAt,
                Purpose = m.Purpose,
            };
    }

    private static List<ExcelColumn<MaterialMovementRow>> MaterialMovementColumns() => new()
    {
        new() { Header = "Movement Number", ValueSelector = r => r.MovementNumber },
        new() { Header = "Movement Type", ValueSelector = r => r.MovementType },
        new() { Header = "Status", ValueSelector = r => r.Status },
        new() { Header = "From Entity", ValueSelector = r => r.FromCompanyName },
        new() { Header = "From Location", ValueSelector = r => r.FromLocationName },
        new() { Header = "From Department", ValueSelector = r => r.FromDepartmentName },
        new() { Header = "To Entity", ValueSelector = r => r.ToCompanyName },
        new() { Header = "To Location", ValueSelector = r => r.ToLocationName },
        new() { Header = "To Department", ValueSelector = r => r.ToDepartmentName },
        new() { Header = "Vendor", ValueSelector = r => r.VendorName },
        new() { Header = "Item Code", ValueSelector = r => r.ItemCode },
        new() { Header = "Item Name", ValueSelector = r => r.ItemName },
        new() { Header = "Material Type", ValueSelector = r => r.MaterialType },
        new() { Header = "Asset Tag", ValueSelector = r => r.AssetTag },
        new() { Header = "Quantity", ValueSelector = r => r.Quantity, Format = ExcelNumberFormat.Number },
        new() { Header = "UOM", ValueSelector = r => r.UnitOfMeasure },
        new() { Header = "Serial Numbers", ValueSelector = r => r.SerialNumbers },
        new() { Header = "Condition", ValueSelector = r => r.Condition },
        new() { Header = "Requested By", ValueSelector = r => r.RequestedByUserName },
        new() { Header = "Requested At", ValueSelector = r => r.RequestedAt, Format = ExcelNumberFormat.Date },
        new() { Header = "Purpose", ValueSelector = r => r.Purpose },
    };

    public async Task<object> GetMaterialMovementPreviewAsync(
        ReportQueryRequest request,
        bool isRestricted,
        int? companyId,
        string[]? forcedTypes)
    {
        if (isRestricted && companyId == null)
        {
            return new PagedResponse<MaterialMovementRow>
            {
                Items = new List<MaterialMovementRow>(),
                Page = request.Page,
                PageSize = request.PageSize,
                TotalRecords = 0,
            };
        }

        var query = BuildMaterialMovementRowQuery(request, isRestricted, companyId, forcedTypes)
            .OrderByDescending(r => r.RequestedAt)
            .ThenBy(r => r.MovementNumber);

        return await PaginateAndBuildAsync(query, request.Page, request.PageSize);
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> GetMaterialMovementExportAsync(
        ReportQueryRequest request,
        bool isRestricted,
        int? companyId,
        ClaimsPrincipal user,
        string reportTitle,
        string fileSlug,
        string[]? forcedTypes)
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
            var emptyBytes = _excelExportService.BuildWorkbook(
                meta, new List<MaterialMovementRow>(), MaterialMovementColumns());
            return (emptyBytes, XlsxContentType, BuildFileName(fileSlug));
        }

        var baseQuery = BuildMaterialMovementRowQuery(request, isRestricted, companyId, forcedTypes);
        var totalCount = await baseQuery.CountAsync();
        if (totalCount > MaxExportRows)
        {
            throw new ReportExportTooLargeException(totalCount);
        }

        var rows = await baseQuery
            .OrderByDescending(r => r.RequestedAt)
            .ThenBy(r => r.MovementNumber)
            .ToListAsync();
        meta.RecordCount = rows.Count;

        var bytes = _excelExportService.BuildWorkbook(meta, rows, MaterialMovementColumns());
        return (bytes, XlsxContentType, BuildFileName(fileSlug));
    }
}
