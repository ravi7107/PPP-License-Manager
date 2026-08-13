using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Management-strategy analytics (cost/spend, utilization/efficiency,
// growth/capacity planning) - the same audience as the Executive
// Dashboard (Super Admin sees everything, Manager sees their own
// Entity only, via EntityScopeHelper). Team Lead/IT Admin don't get
// this - it's cost/strategy data, not day-to-day operations.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Super Admin,Manager")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [HttpGet("executive-overview")]
    public async Task<IActionResult> GetExecutiveOverview()
    {
        var (isRestricted, companyId) = EntityScopeHelper.Resolve(User);

        var result = await _analyticsService.GetExecutiveOverviewAsync(
            isRestricted,
            companyId);

        return Ok(result);
    }
}
