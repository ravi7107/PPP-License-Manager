using PPS.LicenseManager.API.DTOs.Utilization;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IUtilizationTierSettingsService
{
    Task<UtilizationTierSettingsResponse> GetAsync(int? companyId);

    Task<UtilizationTierSettingsResponse> UpdateAsync(
        UpdateUtilizationTierSettingsRequest request,
        int actorUserId);
}
