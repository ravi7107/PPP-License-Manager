using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.DTOs.Vendor;
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

    public Task<PagedResponse<VendorResponse>> GetAllAsync(VendorSearchRequest request)
    {
        throw new NotImplementedException();
    }

    public Task<VendorResponse> GetByIdAsync(int id)
    {
        throw new NotImplementedException();
    }

    public Task<VendorResponse> CreateAsync(CreateVendorRequest request)
    {
        throw new NotImplementedException();
    }

    public Task<VendorResponse> UpdateAsync(int id, UpdateVendorRequest request)
    {
        throw new NotImplementedException();
    }
}
