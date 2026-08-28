using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.ResourceAllocation;
using PPS.LicenseManager.API.Services.Interfaces;


namespace PPS.LicenseManager.API.Controllers;

// Was missing [Authorize] entirely - anyone could allocate/transfer/release
// licenses without logging in. Same gap as License/LicensePurchaseController.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ResourceAllocationController : ControllerBase
{
    private readonly IResourceAllocationService _resourceAllocationService;

    public ResourceAllocationController(IResourceAllocationService resourceAllocationService)
    {
        _resourceAllocationService = resourceAllocationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var allocations = await _resourceAllocationService.GetAllAsync();
        return Ok(allocations);
    }

    [HttpGet("license/{licenseId}/history")]
    public async Task<IActionResult> GetLicenseHistory(int licenseId)
    {
        var history =
            await _resourceAllocationService
                .GetHistoryByLicenseIdAsync(licenseId);

        return Ok(history);
    }

    // Phase 11 - active allocations tied directly to one asset, for the
    // Asset detail views' "Allocated Licenses" section (Hardware page +
    // Office Floor Map). Read-only, so it stays open to any authenticated
    // user like the other GETs above - only the mutating actions below are
    // role-restricted.
    [HttpGet("asset/{assetId}/active")]
    public async Task<IActionResult> GetActiveByAsset(int assetId)
    {
        var allocations =
            await _resourceAllocationService.GetActiveByAssetIdAsync(assetId);

        return Ok(allocations);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var allocation = await _resourceAllocationService.GetByIdAsync(id);

        if (allocation == null)
            return NotFound();

        return Ok(allocation);
    }

// Allocate/transfer/release/create/update/delete are all restricted to
// the Allocations module's own audience (frontend/lib/auth/roles.ts
// MODULE_ACCESS.allocations) - Super Admin, IT Admin, Team Lead. Reads
// above stay open to any authenticated user.
[Authorize(Roles = "Super Admin,IT Admin,Team Lead")]
[HttpPost("{id}/transfer")]
public async Task<IActionResult> Transfer(
    int id,
    TransferResourceAllocationRequest request)
{
    var allocation =
        await _resourceAllocationService.TransferAsync(
            id,
            request);

    if (allocation == null)
        return NotFound();

    return Ok(allocation);
}

[Authorize(Roles = "Super Admin,IT Admin,Team Lead")]
[HttpPost("{id}/release")]
public async Task<IActionResult> Release(int id, ReleaseResourceAllocationRequest request)
{
    var released = await _resourceAllocationService.ReleaseAsync(id, request);

    if (!released)
        return NotFound();

    return Ok(new
    {
        Success = true,
        Message = "License released successfully."
    });
}

    [Authorize(Roles = "Super Admin,IT Admin,Team Lead")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateResourceAllocationRequest request)
    {
        var allocation = await _resourceAllocationService.CreateAsync(request);

        return CreatedAtAction(nameof(GetById),
            new { id = allocation.Id },
            allocation);
    }

    [Authorize(Roles = "Super Admin,IT Admin,Team Lead")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateResourceAllocationRequest request)
    {
        var allocation = await _resourceAllocationService.UpdateAsync(id, request);

        if (allocation == null)
            return NotFound();

        return Ok(allocation);
    }

    [Authorize(Roles = "Super Admin,IT Admin,Team Lead")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _resourceAllocationService.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
