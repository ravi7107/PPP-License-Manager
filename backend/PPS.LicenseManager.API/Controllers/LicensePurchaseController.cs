using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.DTOs.LicensePurchase;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Was missing [Authorize] entirely - every other data-bearing controller
// in this app requires it, and this one exposes purchase costs/vendor
// details, so this is a straightforward fix rather than a design choice.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LicensePurchaseController : ControllerBase
{
    private readonly ILicensePurchaseService _licensePurchaseService;

    public LicensePurchaseController(
        ILicensePurchaseService licensePurchaseService)
    {
        _licensePurchaseService = licensePurchaseService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var (isEntityRestricted, companyId) = EntityScopeHelper.Resolve(User);

        var purchases =
            await _licensePurchaseService.GetAllAsync(
                isEntityRestricted,
                companyId);

        return Ok(purchases);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var purchase =
            await _licensePurchaseService.GetByIdAsync(id);

        if (purchase == null)
            return NotFound();

        return Ok(purchase);
    }

    // Purchase records live inside the Software Licenses module
    // (frontend/lib/auth/roles.ts MODULE_ACCESS.licenses) - Super Admin,
    // IT Admin, Manager.
    [Authorize(Roles = "Super Admin,IT Admin,Manager")]
    [HttpPost]
    public async Task<IActionResult> Create(
        CreateLicensePurchaseRequest request)
    {
        var purchase =
            await _licensePurchaseService.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = purchase.Id },
            purchase);
    }

    [Authorize(Roles = "Super Admin,IT Admin,Manager")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateLicensePurchaseRequest request)
    {
        var updated =
            await _licensePurchaseService.UpdateAsync(id, request);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [Authorize(Roles = "Super Admin,IT Admin,Manager")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted =
            await _licensePurchaseService.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
