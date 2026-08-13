using PPS.LicenseManager.API.DTOs.Analytics;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IAnalyticsService
{
    Task<ExecutiveOverviewResponse> GetExecutiveOverviewAsync(
        bool isEntityRestricted,
        int? companyId);
}
