using PPS.LicenseManager.API.DTOs.License;

namespace PPS.LicenseManager.API.Interfaces;

public interface ILicenseService
{
    Task<List<LicenseResponse>> GetAllAsync();

    Task<LicenseResponse?> GetByIdAsync(int id);

    Task<LicenseResponse> CreateAsync(CreateLicenseRequest request);

    Task<bool> UpdateAsync(int id, UpdateLicenseRequest request);

    Task<bool> DeleteAsync(int id);
}
