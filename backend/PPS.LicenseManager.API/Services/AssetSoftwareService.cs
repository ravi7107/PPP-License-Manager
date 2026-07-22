using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.AssetSoftware;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class AssetSoftwareService : IAssetSoftwareService
{
    private readonly ApplicationDbContext _context;

    public AssetSoftwareService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AssetSoftwareResponse>> GetAllAsync()
    {
        return await _context.AssetSoftwares
            .Include(x => x.Asset)
            .Include(x => x.Software)
            .Select(x => new AssetSoftwareResponse
            {
                Id = x.Id,
                AssetId = x.AssetId,
                AssetTag = x.Asset != null ? x.Asset.AssetTag : string.Empty,
                SoftwareId = x.SoftwareId,
                SoftwareName = x.Software != null ? x.Software.Name : string.Empty,
                Version = x.Version,
                LicenseKey = x.LicenseKey,
                InstallDate = x.InstallDate,
                Status = x.Status,
                Remarks = x.Remarks,
                IsActive = x.IsActive
            })
            .ToListAsync();
    }

    public async Task<AssetSoftwareResponse?> GetByIdAsync(int id)
    {
        var item = await _context.AssetSoftwares
            .Include(x => x.Asset)
            .Include(x => x.Software)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (item == null)
            return null;

        return new AssetSoftwareResponse
        {
            Id = item.Id,
            AssetId = item.AssetId,
            AssetTag = item.Asset?.AssetTag ?? string.Empty,
            SoftwareId = item.SoftwareId,
            SoftwareName = item.Software?.Name ?? string.Empty,
            Version = item.Version,
            LicenseKey = item.LicenseKey,
            InstallDate = item.InstallDate,
            Status = item.Status,
            Remarks = item.Remarks,
            IsActive = item.IsActive
        };
    }

    public async Task<IEnumerable<AssetSoftwareResponse>> GetByAssetIdAsync(int assetId)
    {
        return await _context.AssetSoftwares
            .Include(x => x.Asset)
            .Include(x => x.Software)
            .Where(x => x.AssetId == assetId)
            .Select(x => new AssetSoftwareResponse
            {
                Id = x.Id,
                AssetId = x.AssetId,
                AssetTag = x.Asset != null ? x.Asset.AssetTag : string.Empty,
                SoftwareId = x.SoftwareId,
                SoftwareName = x.Software != null ? x.Software.Name : string.Empty,
                Version = x.Version,
                LicenseKey = x.LicenseKey,
                InstallDate = x.InstallDate,
                Status = x.Status,
                Remarks = x.Remarks,
                IsActive = x.IsActive
            })
            .ToListAsync();
    }

    public async Task<AssetSoftwareResponse> CreateAsync(CreateAssetSoftwareRequest request)
    {
        var asset = await _context.Assets
            .FirstOrDefaultAsync(a => a.Id == request.AssetId && a.IsActive);

        if (asset == null)
            throw new InvalidOperationException("Asset not found.");

        var software = await _context.Software
            .FirstOrDefaultAsync(s => s.Id == request.SoftwareId && s.IsActive);

        if (software == null)
            throw new InvalidOperationException("Software not found.");

        var exists = await _context.AssetSoftwares.AnyAsync(x =>
            x.AssetId == request.AssetId &&
            x.SoftwareId == request.SoftwareId &&
            x.IsActive);

        if (exists)
            throw new InvalidOperationException("Software is already assigned to this asset.");

        var item = new AssetSoftware
        {
            AssetId = request.AssetId,
            SoftwareId = request.SoftwareId,
            Version = request.Version,
            LicenseKey = request.LicenseKey,
            InstallDate = request.InstallDate,
            Status = request.Status,
            Remarks = request.Remarks,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.AssetSoftwares.Add(item);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(item.Id)
            ?? throw new Exception("Unable to load created record.");
    }

    public async Task<AssetSoftwareResponse?> UpdateAsync(int id, UpdateAssetSoftwareRequest request)
{
    var item = await _context.AssetSoftwares
        .Include(x => x.Asset)
        .Include(x => x.Software)
        .FirstOrDefaultAsync(x => x.Id == id);

    if (item == null)
        return null;

    item.Version = request.Version;
    item.LicenseKey = request.LicenseKey;
    item.InstallDate = request.InstallDate;
    item.Status = request.Status;
    item.Remarks = request.Remarks;
    item.IsActive = request.IsActive;

    await _context.SaveChangesAsync();

    return await GetByIdAsync(id);
}

    public async Task<bool> DeleteAsync(int id)
{
    var item = await _context.AssetSoftwares.FindAsync(id);

    if (item == null)
        return false;

    _context.AssetSoftwares.Remove(item);

    await _context.SaveChangesAsync();

    return true;
}
}
	
