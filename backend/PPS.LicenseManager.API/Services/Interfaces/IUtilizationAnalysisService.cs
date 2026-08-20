using PPS.LicenseManager.API.DTOs.Utilization;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IUtilizationAnalysisService
{
    Task<UtilizationOverviewResponse> GetOverviewAsync(int? softwareId, int? uploadBatchId);

    Task<List<UtilizationTierDistributionRow>> GetTierDistributionAsync(int? softwareId, int? uploadBatchId);

    Task<List<UtilizationDepartmentConcentrationRow>> GetDepartmentConcentrationAsync(int? softwareId, int? uploadBatchId);

    Task<List<UtilizationLeastUsedUserRow>> GetLeastUsedUsersAsync(int? softwareId, int? uploadBatchId, int take);

    Task<List<UtilizationUsageDistributionBucket>> GetUsageDistributionAsync(int? softwareId, int? uploadBatchId);
}
