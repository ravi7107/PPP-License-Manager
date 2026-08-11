using PPS.LicenseManager.API.DTOs.Vendor;

namespace PPS.LicenseManager.API.Services.Interfaces;

/*
 * Mirrors IDepartmentService's shape (simple unpaged list + client-side
 * search, soft-delete via IsActive) rather than the paged/searchable
 * VendorSearchRequest this interface originally shipped with - that
 * matches how every other "directory" admin list in this app works
 * (Departments, Entities, Clients), and this is the first time any of
 * these methods actually got implemented (VendorService previously threw
 * NotImplementedException from every method, and nothing called it).
 */
public interface IVendorService
{
    Task<IEnumerable<VendorResponse>> GetAllAsync();

    Task<VendorResponse?> GetByIdAsync(int id);

    Task<VendorResponse> CreateAsync(CreateVendorRequest request);

    Task<VendorResponse?> UpdateAsync(int id, UpdateVendorRequest request);

    Task<bool> DeleteAsync(int id);
}
