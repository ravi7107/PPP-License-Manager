using PPS.LicenseManager.API.DTOs.Software;

namespace PPS.LicenseManager.API.Interfaces;

public interface ISoftwareService
{
    Task<List<SoftwareResponse>> GetAllAsync();

    Task<SoftwareResponse?> GetByIdAsync(int id);

    Task<SoftwareResponse> CreateAsync(CreateSoftwareRequest request);

    Task<bool> UpdateAsync(int id, UpdateSoftwareRequest request);

    Task<bool> DeleteAsync(int id);
}
