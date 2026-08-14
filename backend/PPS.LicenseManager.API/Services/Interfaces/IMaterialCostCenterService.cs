using PPS.LicenseManager.API.DTOs.MaterialCostCenter;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IMaterialCostCenterService
{
    Task<IEnumerable<MaterialCostCenterResponse>> GetAllAsync();

    Task<MaterialCostCenterResponse?> GetByIdAsync(int id);

    Task<MaterialCostCenterResponse> CreateAsync(
        CreateMaterialCostCenterRequest request);

    Task<MaterialCostCenterResponse?> UpdateAsync(
        int id,
        UpdateMaterialCostCenterRequest request);

    Task<bool> DeleteAsync(int id);
}
