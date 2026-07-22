using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.DTOs.Vendor;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Repositories.Interfaces;

public interface IVendorRepository
{
    Task<List<Vendor>> GetAllAsync();

    Task<Vendor?> GetByIdAsync(int id);

    Task<Vendor?> GetByCodeAsync(string vendorCode);

    Task<PagedResponse<Vendor>> SearchAsync(VendorSearchRequest request);

    Task AddAsync(Vendor vendor);

    Task UpdateAsync(Vendor vendor);

    Task SaveChangesAsync();
}
