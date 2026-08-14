using PPS.LicenseManager.API.DTOs.MaterialTransporter;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IMaterialTransporterService
{
    Task<IEnumerable<MaterialTransporterResponse>> GetAllAsync();

    Task<MaterialTransporterResponse?> GetByIdAsync(int id);

    Task<MaterialTransporterResponse> CreateAsync(
        CreateMaterialTransporterRequest request);

    Task<MaterialTransporterResponse?> UpdateAsync(
        int id,
        UpdateMaterialTransporterRequest request);

    Task<bool> DeleteAsync(int id);
}
