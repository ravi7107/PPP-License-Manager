using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Utilization;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Usage-tier threshold configuration - GET open to the module's normal
// viewer roles (the dashboard needs to know current thresholds to label
// its own charts correctly), PUT restricted to Super Admin/IT Admin,
// matching PurchaseRequisitionSettingsController's read/write split.
[Authorize(Roles = "Super Admin,IT Admin,Manager")]
[ApiController]
[Route("api/[controller]")]
public class UtilizationTierSettingsController : BaseController
{
    private readonly IUtilizationTierSettingsService _service;

    public UtilizationTierSettingsController(IUtilizationTierSettingsService service)
    {
        _service = service;
    }

    private int GetCurrentUserId()
    {
        var value = User.FindFirst("UserId")?.Value;

        if (string.IsNullOrWhiteSpace(value) || !int.TryParse(value, out var userId))
            throw new UnauthorizedAccessException(
                "Authenticated user ID is missing from the token.");

        return userId;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int? companyId)
    {
        var settings = await _service.GetAsync(companyId);
        return Success(settings, "Tier settings retrieved successfully.");
    }

    [HttpPut]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> Update([FromBody] UpdateUtilizationTierSettingsRequest request)
    {
        try
        {
            var settings = await _service.UpdateAsync(request, GetCurrentUserId());
            return Success(settings, "Tier settings updated successfully.");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }
}
