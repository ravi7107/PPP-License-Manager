using PPS.LicenseManager.API.DTOs.Vendor;
using PPS.LicenseManager.API.Common;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IVendorService
{
    Task<PagedResponse<VendorResponse>> GetAllAsync(VendorSearchRequest request);

    Task<VendorResponse> GetByIdAsync(int id);

    Task<VendorResponse> CreateAsync(CreateVendorRequest request);

    Task<VendorResponse> UpdateAsync(int id, UpdateVendorRequest request);
}
