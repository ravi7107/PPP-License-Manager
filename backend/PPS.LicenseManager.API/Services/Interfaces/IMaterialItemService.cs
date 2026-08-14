using PPS.LicenseManager.API.DTOs.MaterialItem;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IMaterialItemService
{
    Task<IEnumerable<MaterialItemResponse>> GetAllAsync();

    Task<MaterialItemResponse?> GetByIdAsync(int id);

    Task<MaterialItemResponse> CreateAsync(
        CreateMaterialItemRequest request);

    Task<MaterialItemResponse?> UpdateAsync(
        int id,
        UpdateMaterialItemRequest request);

    Task<bool> DeleteAsync(int id);
}
