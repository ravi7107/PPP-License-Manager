using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Asset;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;

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
}
