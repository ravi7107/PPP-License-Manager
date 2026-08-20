using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.DTOs.License;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Was missing [Authorize] entirely, same gap as LicensePurchaseController.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LicenseController : ControllerBase
{
    private readonly ILicenseService _licenseService;

    public LicenseController(ILicenseService licenseService)
    {
        _licenseService = licenseService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var (isEntityRestricted, companyId) = EntityScopeHelper.Resolve(User);

        var licenses = await _licenseService.GetAllAsync(
            isEntityRestricted,
            companyId);

        return Ok(licenses);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var license = await _licenseService.GetByIdAsync(id);

        if (license == null)
            return NotFound();

        return Ok(license);
    }

    // Reads stay open to any authenticated user (license counts also feed
    // Dashboard/Reports for roles outside the Licenses module). Mutations
    // are restricted to the Software Licenses module's own audience
    // (frontend/lib/auth/roles.ts MODULE_ACCESS.licenses) - Super Admin,
    // IT Admin, Manager.
    [Authorize(Roles = "Super Admin,IT Admin,Manager")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateLicenseRequest request)
    {
        var license = await _licenseService.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = license.Id },
            license);
    }

    [Authorize(Roles = "Super Admin,IT Admin,Manager")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateLicenseRequest request)
    {
        var updated = await _licenseService.UpdateAsync(id, request);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [Authorize(Roles = "Super Admin,IT Admin,Manager")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _licenseService.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
