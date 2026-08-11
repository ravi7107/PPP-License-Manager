using PPS.LicenseManager.API.DTOs.Vendor;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Repositories.Interfaces;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class VendorService : IVendorService
{
    private readonly IVendorRepository _repository;

    public VendorService(IVendorRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<VendorResponse>> GetAllAsync()
    {
        var vendors = await _repository.GetAllAsync();

        return vendors.Select(MapToResponse);
    }

    public async Task<VendorResponse?> GetByIdAsync(int id)
    {
        var vendor = await _repository.GetByIdAsync(id);

        return vendor == null ? null : MapToResponse(vendor);
    }

    public async Task<VendorResponse> CreateAsync(CreateVendorRequest request)
    {
        var code = request.VendorCode.Trim();

        var existing = await _repository.GetByCodeAsync(code);

        if (existing != null)
            throw new InvalidOperationException(
                "A vendor with this code already exists.");

        var vendor = new Vendor
        {
            VendorCode = code,
            VendorName = request.VendorName.Trim(),
            ContactPerson = Normalize(request.ContactPerson),
            Email = Normalize(request.Email),
            Phone = Normalize(request.Phone),
            Address = Normalize(request.Address),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(vendor);
        await _repository.SaveChangesAsync();

        return MapToResponse(vendor);
    }

    public async Task<VendorResponse?> UpdateAsync(int id, UpdateVendorRequest request)
    {
        var vendor = await _repository.GetByIdAsync(id);

        if (vendor == null)
            return null;

        var code = request.VendorCode.Trim();

        var duplicate = await _repository.GetByCodeAsync(code);

        if (duplicate != null && duplicate.Id != id)
            throw new InvalidOperationException(
                "A vendor with this code already exists.");

        vendor.VendorCode = code;
        vendor.VendorName = request.VendorName.Trim();
        vendor.ContactPerson = Normalize(request.ContactPerson);
        vendor.Email = Normalize(request.Email);
        vendor.Phone = Normalize(request.Phone);
        vendor.Address = Normalize(request.Address);
        vendor.IsActive = request.IsActive;
        vendor.UpdatedAt = DateTime.UtcNow;

        await _repository.UpdateAsync(vendor);
        await _repository.SaveChangesAsync();

        return MapToResponse(vendor);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var vendor = await _repository.GetByIdAsync(id);

        if (vendor == null)
            return false;

        // Soft delete so historical purchase requisitions referencing this
        // vendor (PurchaseRequisitions.VendorId is ON DELETE RESTRICT)
        // keep working, and so it simply drops out of the active picker
        // list on future PRs.
        vendor.IsActive = false;
        vendor.UpdatedAt = DateTime.UtcNow;

        await _repository.UpdateAsync(vendor);
        await _repository.SaveChangesAsync();

        return true;
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static VendorResponse MapToResponse(Vendor vendor) => new()
    {
        Id = vendor.Id,
        VendorCode = vendor.VendorCode,
        VendorName = vendor.VendorName,
        ContactPerson = vendor.ContactPerson,
        Email = vendor.Email,
        Phone = vendor.Phone,
        Address = vendor.Address,
        IsActive = vendor.IsActive,
        CreatedAt = vendor.CreatedAt
    };
}
