using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.MaterialTransporter;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Material Movement master data - Super Admin/IT Admin only, matching
// frontend/lib/auth/roles.ts MODULE_ACCESS.materialTransporters.
[Authorize(Roles = "Super Admin,IT Admin")]
[ApiController]
[Route("api/[controller]")]
public class MaterialTransporterController : BaseController
{
    private readonly IMaterialTransporterService _service;

    public MaterialTransporterController(IMaterialTransporterService service)
    {
        _service = service;
    }

    // GET: api/MaterialTransporter
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();

        return Success(
            result,
            "Material transporters retrieved successfully.");
    }

    // GET: api/MaterialTransporter/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFoundResponse("Material transporter not found.");

        return Success(
            result,
            "Material transporter retrieved successfully.");
    }

    // POST: api/MaterialTransporter
    [HttpPost]
    public async Task<IActionResult> Create(
        CreateMaterialTransporterRequest request)
    {
        var result = await _service.CreateAsync(request);

        return CreatedResponse(
            nameof(GetById),
            new { id = result.Id },
            result,
            "Material transporter created successfully.");
    }

    // PUT: api/MaterialTransporter/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateMaterialTransporterRequest request)
    {
        var result = await _service.UpdateAsync(id, request);

        if (result == null)
            return NotFoundResponse("Material transporter not found.");

        return Success(
            result,
            "Material transporter updated successfully.");
    }

    // DELETE: api/MaterialTransporter/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
            return NotFoundResponse("Material transporter not found.");

        return SuccessMessage(
            "Material transporter deactivated successfully.");
    }
}
