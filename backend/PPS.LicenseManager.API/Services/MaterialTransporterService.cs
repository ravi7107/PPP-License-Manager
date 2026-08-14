using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.MaterialTransporter;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class MaterialTransporterService : IMaterialTransporterService
{
    private readonly ApplicationDbContext _context;

    public MaterialTransporterService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MaterialTransporterResponse>> GetAllAsync()
    {
        return await _context.MaterialTransporters
            .AsNoTracking()
            .OrderBy(t => t.Name)
            .Select(t => new MaterialTransporterResponse
            {
                Id = t.Id,
                Name = t.Name,
                ContactName = t.ContactName,
                ContactPhone = t.ContactPhone,
                ContactEmail = t.ContactEmail,
                VehicleDetails = t.VehicleDetails,
                IsActive = t.IsActive,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<MaterialTransporterResponse?> GetByIdAsync(int id)
    {
        return await _context.MaterialTransporters
            .AsNoTracking()
            .Where(t => t.Id == id)
            .Select(t => new MaterialTransporterResponse
            {
                Id = t.Id,
                Name = t.Name,
                ContactName = t.ContactName,
                ContactPhone = t.ContactPhone,
                ContactEmail = t.ContactEmail,
                VehicleDetails = t.VehicleDetails,
                IsActive = t.IsActive,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<MaterialTransporterResponse> CreateAsync(
        CreateMaterialTransporterRequest request)
    {
        var transporter = new Models.MaterialTransporter
        {
            Name = request.Name.Trim(),
            ContactName = NullIfBlank(request.ContactName),
            ContactPhone = NullIfBlank(request.ContactPhone),
            ContactEmail = NullIfBlank(request.ContactEmail),
            VehicleDetails = NullIfBlank(request.VehicleDetails),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.MaterialTransporters.Add(transporter);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(transporter.Id)
            ?? throw new Exception(
                "Unable to load created transporter.");
    }

    public async Task<MaterialTransporterResponse?> UpdateAsync(
        int id,
        UpdateMaterialTransporterRequest request)
    {
        var transporter = await _context.MaterialTransporters
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transporter == null)
            return null;

        transporter.Name = request.Name.Trim();
        transporter.ContactName = NullIfBlank(request.ContactName);
        transporter.ContactPhone = NullIfBlank(request.ContactPhone);
        transporter.ContactEmail = NullIfBlank(request.ContactEmail);
        transporter.VehicleDetails = NullIfBlank(request.VehicleDetails);
        transporter.IsActive = request.IsActive;
        transporter.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var transporter = await _context.MaterialTransporters
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transporter == null)
            return false;

        transporter.IsActive = false;
        transporter.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
