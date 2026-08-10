using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Asset;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Common;


namespace PPS.LicenseManager.API.Services;

public class AssetService : IAssetService
{
    private readonly ApplicationDbContext _context;

    public AssetService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AssetResponse>> GetAllAsync()
    {
        return await _context.Assets
            .Include(a => a.Department)
            .Select(a => new AssetResponse
            {
                Id = a.Id,
                AssetTag = a.AssetTag,
                AssetName = a.AssetName,
                AssetType = a.AssetType,
                Manufacturer = a.Manufacturer,
                Model = a.Model,
                HostName = a.HostName,
                Processor = a.Processor,
                RamGb = a.RamGb,
                StorageGb = a.StorageGb,
                GraphicsCard = a.GraphicsCard,
                OperatingSystem = a.OperatingSystem,
                DepartmentName = a.Department != null
                    ? a.Department.DepartmentName
                    : string.Empty,
                Status = a.Status,
                WarrantyExpiry = a.WarrantyExpiry,
                IsReadyForAssignment = a.IsReadyForAssignment,
                IsActive = a.IsActive
            })
            .ToListAsync();
    }

public async Task<PagedResponse<AssetResponse>> GetPagedAsync(AssetFilterRequest request)
{
    var query = _context.Assets
        .Include(a => a.Department)
        .Where(a => a.IsActive);

    // Global Search
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
        var search = request.Search.Trim().ToLower();

        query = query.Where(a =>
            a.AssetTag.ToLower().Contains(search) ||
            a.AssetName.ToLower().Contains(search) ||
            (a.SerialNumber != null && a.SerialNumber.ToLower().Contains(search)) ||
            (a.HostName != null && a.HostName.ToLower().Contains(search)) ||
            (a.Manufacturer != null && a.Manufacturer.ToLower().Contains(search)) ||
            (a.Model != null && a.Model.ToLower().Contains(search)));
    }

    // Department Filter
    if (request.DepartmentId.HasValue)
    {
        query = query.Where(a => a.DepartmentId == request.DepartmentId);
    }

    // Asset Type
    if (!string.IsNullOrWhiteSpace(request.AssetType))
    {
        query = query.Where(a => a.AssetType == request.AssetType);
    }

    // Manufacturer
    if (!string.IsNullOrWhiteSpace(request.Manufacturer))
    {
        query = query.Where(a => a.Manufacturer == request.Manufacturer);
    }

    // Status
    if (!string.IsNullOrWhiteSpace(request.Status))
    {
        query = query.Where(a => a.Status == request.Status);
    }

    var totalRecords = await query.CountAsync();

    query = request.SortDirection.ToLower() == "desc"
        ? query.OrderByDescending(a => a.AssetTag)
        : query.OrderBy(a => a.AssetTag);

    var assets = await query
        .Skip((request.Page - 1) * request.PageSize)
        .Take(request.PageSize)
        .ToListAsync();

    return new PagedResponse<AssetResponse>
    {
        Items = assets.Select(MapToResponse).ToList(),
        Page = request.Page,
        PageSize = request.PageSize,
        TotalRecords = totalRecords
    };
}

    public async Task<AssetResponse?> GetByIdAsync(int id)
    {
        var asset = await _context.Assets
            .Include(a => a.Department)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset == null)
            return null;

        return new AssetResponse
        {
            Id = asset.Id,
            AssetTag = asset.AssetTag,
            AssetName = asset.AssetName,
            AssetType = asset.AssetType,
            Manufacturer = asset.Manufacturer,
            Model = asset.Model,
            HostName = asset.HostName,
            Processor = asset.Processor,
            RamGb = asset.RamGb,
            StorageGb = asset.StorageGb,
            GraphicsCard = asset.GraphicsCard,
            OperatingSystem = asset.OperatingSystem,
            DepartmentName = asset.Department != null
                ? asset.Department.DepartmentName
                : string.Empty,
            Status = asset.Status,
            WarrantyExpiry = asset.WarrantyExpiry,
            IsReadyForAssignment = asset.IsReadyForAssignment,
            IsActive = asset.IsActive
        };
    }

public async Task<IEnumerable<RecentAssetResponse>> GetRecentAssetsAsync(int count = 10)
{
    return await _context.Assets
        .Include(a => a.Department)
        .Where(a => a.IsActive)
        .OrderByDescending(a => a.CreatedAt)
        .Take(count)
        .Select(a => new RecentAssetResponse
        {
            Id = a.Id,
            AssetTag = a.AssetTag,
            AssetName = a.AssetName,
            AssetType = a.AssetType,
            DepartmentName = a.Department != null
                ? a.Department.DepartmentName
                : "Unknown",
            Status = a.Status,
            CreatedAt = a.CreatedAt
        })
        .ToListAsync();
}

public async Task<AssetDashboardOverviewResponse> GetDashboardOverviewAsync()
{
    return new AssetDashboardOverviewResponse
    {
        Kpis = await GetDashboardAsync(),
        DepartmentSummary = await GetDepartmentSummaryAsync(),
        ManufacturerSummary = await GetManufacturerSummaryAsync(),
        AssetTypeSummary = await GetAssetTypeSummaryAsync(),
        Warranty = await GetWarrantySummaryAsync()
    };
}

public async Task<WarrantySummaryResponse> GetWarrantySummaryAsync()
{
    var today = DateTime.UtcNow.Date;

    var assets = _context.Assets.Where(a => a.IsActive);

    return new WarrantySummaryResponse
    {
        TotalAssets = await assets.CountAsync(),

        UnderWarranty = await assets.CountAsync(a =>
            a.WarrantyExpiry != null &&
            a.WarrantyExpiry >= today),

        ExpiredWarranty = await assets.CountAsync(a =>
            a.WarrantyExpiry != null &&
            a.WarrantyExpiry < today),

        ExpiringIn30Days = await assets.CountAsync(a =>
            a.WarrantyExpiry != null &&
            a.WarrantyExpiry >= today &&
            a.WarrantyExpiry <= today.AddDays(30)),

        ExpiringIn60Days = await assets.CountAsync(a =>
            a.WarrantyExpiry != null &&
            a.WarrantyExpiry > today.AddDays(30) &&
            a.WarrantyExpiry <= today.AddDays(60)),

        ExpiringIn90Days = await assets.CountAsync(a =>
            a.WarrantyExpiry != null &&
            a.WarrantyExpiry > today.AddDays(60) &&
            a.WarrantyExpiry <= today.AddDays(90)),

        NoWarranty = await assets.CountAsync(a =>
            a.WarrantyExpiry == null)
    };
}

public async Task<IEnumerable<ManufacturerSummaryResponse>> GetManufacturerSummaryAsync()
{
    return await _context.Assets
        .Where(a => a.IsActive)
        .GroupBy(a => a.Manufacturer)
        .Select(g => new ManufacturerSummaryResponse
        {
            Manufacturer = string.IsNullOrWhiteSpace(g.Key)
                ? "Unknown"
                : g.Key,
            AssetCount = g.Count()
        })
        .OrderByDescending(x => x.AssetCount)
        .ToListAsync();
}


public async Task<IEnumerable<AssetTypeSummaryResponse>> GetAssetTypeSummaryAsync()
{
    return await _context.Assets
        .Where(a => a.IsActive)
        .GroupBy(a => a.AssetType)
        .Select(g => new AssetTypeSummaryResponse
        {
            AssetType = g.Key,
            AssetCount = g.Count()
        })
        .OrderByDescending(x => x.AssetCount)
        .ToListAsync();
}

public async Task<IEnumerable<DepartmentAssetSummary>> GetDepartmentSummaryAsync()
{
    return await _context.Assets
        .Where(a => a.IsActive)
        .GroupBy(a => new
        {
            a.DepartmentId,
            DepartmentName = a.Department != null
                ? a.Department.DepartmentName
                : "Unknown"
        })
        .Select(g => new DepartmentAssetSummary
        {
            DepartmentId = g.Key.DepartmentId,
            DepartmentName = g.Key.DepartmentName,
            AssetCount = g.Count()
        })
        .OrderByDescending(x => x.AssetCount)
        .ToListAsync();
}

public async Task<AssetDashboardResponse> GetDashboardAsync()
{
    var today = DateTime.UtcNow.Date;

    return new AssetDashboardResponse
    {
        TotalAssets = await _context.Assets.CountAsync(a => a.IsActive),

        AvailableAssets = await _context.Assets.CountAsync(a =>
            a.IsActive && a.Status == "Available"),

        AssignedAssets = await _context.Assets.CountAsync(a =>
            a.IsActive && a.Status == "Assigned"),

        MaintenanceAssets = await _context.Assets.CountAsync(a =>
            a.IsActive && a.Status == "Maintenance"),

        RetiredAssets = await _context.Assets.CountAsync(a =>
            a.IsActive && a.Status == "Retired"),

        WarrantyExpired = await _context.Assets.CountAsync(a =>
            a.IsActive &&
            a.WarrantyExpiry != null &&
            a.WarrantyExpiry < today),

        Warranty30Days = await _context.Assets.CountAsync(a =>
            a.IsActive &&
            a.WarrantyExpiry >= today &&
            a.WarrantyExpiry <= today.AddDays(30)),

        Warranty60Days = await _context.Assets.CountAsync(a =>
            a.IsActive &&
            a.WarrantyExpiry > today.AddDays(30) &&
            a.WarrantyExpiry <= today.AddDays(60)),

        Warranty90Days = await _context.Assets.CountAsync(a =>
            a.IsActive &&
            a.WarrantyExpiry > today.AddDays(60) &&
            a.WarrantyExpiry <= today.AddDays(90))
    };
}

    public async Task<AssetResponse> CreateAsync(CreateAssetRequest request)
    {
        if (await _context.Assets.AnyAsync(a => a.AssetTag == request.AssetTag))
        {
            throw new InvalidOperationException($"Asset Tag '{request.AssetTag}' already exists.");
        }

        var department = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == request.DepartmentId);

        if (department == null)
        {
            throw new InvalidOperationException("Department not found.");
        }

        var asset = new Asset
        {
            AssetTag = request.AssetTag,
            AssetName = request.AssetName,
            AssetType = request.AssetType,
            Manufacturer = request.Manufacturer ?? string.Empty,
            Model = request.Model ?? string.Empty,
            SerialNumber = request.SerialNumber ?? string.Empty,
            HostName = request.HostName ?? string.Empty,
            Processor = request.Processor,
            RamGb = request.RamGb,
            StorageGb = request.StorageGb,
            GraphicsCard = request.GraphicsCard,
            OperatingSystem = request.OperatingSystem,
            DepartmentId = request.DepartmentId,
            PurchaseDate = request.PurchaseDate,
            WarrantyExpiry = request.WarrantyExpiry,
            Remarks = request.Remarks,
            Status = "Available",
            IsReadyForAssignment = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Assets.Add(asset);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(asset.Id)
            ?? throw new Exception("Unable to load created asset.");
    }

    public async Task<AssetResponse?> UpdateAsync(int id, UpdateAssetRequest request)
    {
        var asset = await _context.Assets
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset == null)
            return null;

        if (await _context.Assets.AnyAsync(a =>
            a.AssetTag == request.AssetTag &&
            a.Id != id))
        {
            throw new InvalidOperationException($"Asset Tag '{request.AssetTag}' already exists.");
        }

        var department = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == request.DepartmentId);

        if (department == null)
        {
            throw new InvalidOperationException("Department not found.");
        }

        asset.AssetTag = request.AssetTag;
        asset.AssetName = request.AssetName;
        asset.AssetType = request.AssetType;
        asset.Manufacturer = request.Manufacturer ?? string.Empty;
        asset.Model = request.Model ?? string.Empty;
        asset.SerialNumber = request.SerialNumber ?? string.Empty;
        asset.HostName = request.HostName ?? string.Empty;
        asset.Processor = request.Processor;
        asset.RamGb = request.RamGb;
        asset.StorageGb = request.StorageGb;
        asset.GraphicsCard = request.GraphicsCard;
        asset.OperatingSystem = request.OperatingSystem;
        asset.DepartmentId = request.DepartmentId;
        asset.PurchaseDate = request.PurchaseDate;
        asset.WarrantyExpiry = request.WarrantyExpiry;
        asset.Remarks = request.Remarks;
        asset.Status = request.Status;
        asset.IsActive = request.IsActive;
        asset.IsReadyForAssignment = request.IsReadyForAssignment;
        asset.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var asset = await _context.Assets.FindAsync(id);

        if (asset == null)
            return false;

        _context.Assets.Remove(asset);

        await _context.SaveChangesAsync();

        return true;

    }
private static AssetResponse MapToResponse(Asset asset)
{
    return new AssetResponse
    {
        Id = asset.Id,
        AssetTag = asset.AssetTag,
        AssetName = asset.AssetName,
        AssetType = asset.AssetType,
        Manufacturer = asset.Manufacturer,
        Model = asset.Model,
        HostName = asset.HostName,
        Processor = asset.Processor,
        RamGb = asset.RamGb,
        StorageGb = asset.StorageGb,
        GraphicsCard = asset.GraphicsCard,
        OperatingSystem = asset.OperatingSystem,
        SerialNumber = asset.SerialNumber,
        DepartmentId = asset.DepartmentId,
        DepartmentName = asset.Department?.DepartmentName ?? "",
        Status = asset.Status,
        PurchaseDate = asset.PurchaseDate,
        WarrantyExpiry = asset.WarrantyExpiry,
        Remarks = asset.Remarks,
        IsReadyForAssignment = asset.IsReadyForAssignment,
        IsActive = asset.IsActive
    };
}
}
