using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Software;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class SoftwareService : ISoftwareService
{
    private readonly ApplicationDbContext _context;

    public SoftwareService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SoftwareResponse>> GetAllAsync()
    {
        return await _context.Software
            .Select(s => new SoftwareResponse
            {
                Id = s.Id,
                Name = s.Name,
                Version = s.Version,
                Vendor = s.Vendor,
                Category = s.Category,
                LicenseType = s.LicenseType,
                IsLicenseRequired = s.IsLicenseRequired,
                Description = s.Description,
                IsActive = s.IsActive
            })
            .ToListAsync();
    }

    public async Task<SoftwareResponse?> GetByIdAsync(int id)
    {
        var s = await _context.Software.FindAsync(id);

        if (s == null)
            return null;

        return new SoftwareResponse
        {
            Id = s.Id,
            Name = s.Name,
            Version = s.Version,
            Vendor = s.Vendor,
            Category = s.Category,
            LicenseType = s.LicenseType,
            IsLicenseRequired = s.IsLicenseRequired,
            Description = s.Description,
            IsActive = s.IsActive
        };
    }

    public async Task<SoftwareResponse> CreateAsync(CreateSoftwareRequest request)
    {
        var software = new Software
        {
            Name = request.Name,
            Version = request.Version,
            Vendor = request.Vendor,
            Category = request.Category,
            LicenseType = request.LicenseType,
            IsLicenseRequired = request.IsLicenseRequired,
            Description = request.Description
        };

software.IsActive = false;
await _context.SaveChangesAsync();

var createdSoftware = await GetByIdAsync(software.Id);

if (createdSoftware == null)
{
    throw new InvalidOperationException("Software was created but could not be retrieved.");
}

return createdSoftware;
}
    public async Task<bool> UpdateAsync(int id, UpdateSoftwareRequest request)
    {
        var software = await _context.Software.FindAsync(id);

        if (software == null)
            return false;

        software.Name = request.Name;
        software.Version = request.Version;
        software.Vendor = request.Vendor;
        software.Category = request.Category;
        software.LicenseType = request.LicenseType;
        software.IsLicenseRequired = request.IsLicenseRequired;
        software.Description = request.Description;
        software.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var software = await _context.Software.FindAsync(id);

        if (software == null)
            return false;

        _context.Software.Remove(software);
        await _context.SaveChangesAsync();

        return true;
    }
}
