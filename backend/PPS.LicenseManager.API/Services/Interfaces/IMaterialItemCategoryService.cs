using PPS.LicenseManager.API.DTOs.MaterialItemCategory;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IMaterialItemCategoryService
{
    Task<IEnumerable<MaterialItemCategoryResponse>> GetAllAsync();

    Task<MaterialItemCategoryResponse?> GetByIdAsync(int id);

    Task<MaterialItemCategoryResponse> CreateAsync(
        CreateMaterialItemCategoryRequest request);

    Task<MaterialItemCategoryResponse?> UpdateAsync(
        int id,
        UpdateMaterialItemCategoryRequest request);

    Task<bool> DeleteAsync(int id);
}
