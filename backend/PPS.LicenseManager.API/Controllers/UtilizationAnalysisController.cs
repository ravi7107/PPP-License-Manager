using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Executive Dashboard for the Software License Utilization & Analytics
// module - read-only, same audience as AnalyticsController (Super Admin,
// IT Admin, Manager - the license/cost-strategy stakeholders).
[Authorize(Roles = "Super Admin,IT Admin,Manager")]
[ApiController]
[Route("api/[controller]")]
public class UtilizationAnalysisController : ControllerBase
{
    private readonly IUtilizationAnalysisService _service;

    public UtilizationAnalysisController(IUtilizationAnalysisService service)
    {
        _service = service;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview([FromQuery] int? softwareId, [FromQuery] int? uploadBatchId)
    {
        return Ok(await _service.GetOverviewAsync(softwareId, uploadBatchId));
    }

    [HttpGet("tier-distribution")]
    public async Task<IActionResult> GetTierDistribution([FromQuery] int? softwareId, [FromQuery] int? uploadBatchId)
    {
        return Ok(await _service.GetTierDistributionAsync(softwareId, uploadBatchId));
    }

    [HttpGet("department-concentration")]
    public async Task<IActionResult> GetDepartmentConcentration([FromQuery] int? softwareId, [FromQuery] int? uploadBatchId)
    {
        return Ok(await _service.GetDepartmentConcentrationAsync(softwareId, uploadBatchId));
    }

    [HttpGet("product-usage")]
    public async Task<IActionResult> GetProductUsage([FromQuery] int? softwareId, [FromQuery] int? uploadBatchId)
    {
        return Ok(await _service.GetProductUsageAsync(softwareId, uploadBatchId));
    }

    [HttpGet("least-used-users")]
    public async Task<IActionResult> GetLeastUsedUsers(
        [FromQuery] int? softwareId, [FromQuery] int? uploadBatchId, [FromQuery] int take = 15)
    {
        return Ok(await _service.GetLeastUsedUsersAsync(softwareId, uploadBatchId, take));
    }

    [HttpGet("usage-distribution")]
    public async Task<IActionResult> GetUsageDistribution([FromQuery] int? softwareId, [FromQuery] int? uploadBatchId)
    {
        return Ok(await _service.GetUsageDistributionAsync(softwareId, uploadBatchId));
    }
}
