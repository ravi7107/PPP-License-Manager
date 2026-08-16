using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.PurchaseRequisition;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Module-wide Purchase Requisition settings - today, just the single
// Finance notification email address (Phase 2 will start reading this to
// decide where the "share with Finance" email goes on final approval).
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PurchaseRequisitionSettingsController : BaseController
{
    private readonly IPurchaseRequisitionSettingsService _service;

    public PurchaseRequisitionSettingsController(
        IPurchaseRequisitionSettingsService service)
    {
        _service = service;
    }

    private bool IsPrivileged()
    {
        return User.IsInRole("Super Admin") || User.IsInRole("IT Admin");
    }

    private int GetCurrentUserId()
    {
        var value = User.FindFirst("UserId")?.Value;

        if (string.IsNullOrWhiteSpace(value) || !int.TryParse(value, out var userId))
            throw new UnauthorizedAccessException(
                "Authenticated user ID is missing from the token.");

        return userId;
    }

    // GET: api/PurchaseRequisitionSettings
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var result = await _service.GetAsync();

        return Success(result, "Settings retrieved successfully.");
    }

    // PUT: api/PurchaseRequisitionSettings
    [HttpPut]
    public async Task<IActionResult> Update(
        UpdatePurchaseRequisitionSettingsRequest request)
    {
        if (!IsPrivileged())
            return BadRequestResponse(
                "Only Super Admin/IT Admin can change these settings.");

        var result = await _service.UpdateAsync(request, GetCurrentUserId());

        return Success(result, "Settings updated successfully.");
    }
}
