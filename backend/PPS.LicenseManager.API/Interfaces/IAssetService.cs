using PPS.LicenseManager.API.DTOs.Asset;
using PPS.LicenseManager.API.Common;
namespace PPS.LicenseManager.API.Interfaces;

public interface IAssetService
{
    Task<IEnumerable<AssetResponse>> GetAllAsync(
        bool isEntityRestricted = false,
        int? companyId = null);
    Task<AssetResponse?> GetByIdAsync(int id);
    Task<AssetResponse> CreateAsync(CreateAssetRequest request);
    Task<AssetResponse?> UpdateAsync(int id, UpdateAssetRequest request);
    Task<bool> DeleteAsync(int id);
    Task<AssetDashboardResponse> GetDashboardAsync();
    Task<IEnumerable<DepartmentAssetSummary>> GetDepartmentSummaryAsync();
    Task<IEnumerable<AssetTypeSummaryResponse>> GetAssetTypeSummaryAsync();
    Task<IEnumerable<ManufacturerSummaryResponse>> GetManufacturerSummaryAsync();
    Task<WarrantySummaryResponse> GetWarrantySummaryAsync();
    Task<AssetDashboardOverviewResponse> GetDashboardOverviewAsync();
    Task<IEnumerable<RecentAssetResponse>> GetRecentAssetsAsync(int count = 10);
    Task<PagedResponse<AssetResponse>> GetPagedAsync(AssetFilterRequest request);
}

