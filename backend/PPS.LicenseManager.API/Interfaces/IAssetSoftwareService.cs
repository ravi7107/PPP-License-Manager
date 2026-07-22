using PPS.LicenseManager.API.DTOs.AssetSoftware;

namespace PPS.LicenseManager.API.Interfaces;

public interface IAssetSoftwareService
{
    Task<IEnumerable<AssetSoftwareResponse>> GetAllAsync();

    Task<AssetSoftwareResponse?> GetByIdAsync(int id);

    Task<IEnumerable<AssetSoftwareResponse>> GetByAssetIdAsync(int assetId);

    Task<AssetSoftwareResponse> CreateAsync(CreateAssetSoftwareRequest request);

    Task<AssetSoftwareResponse?> UpdateAsync(int id, UpdateAssetSoftwareRequest request);

    Task<bool> DeleteAsync(int id);
}
