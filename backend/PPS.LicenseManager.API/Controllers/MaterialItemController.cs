using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.MaterialItem;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Material Movement master data - Super Admin/IT Admin only, matching
// frontend/lib/auth/roles.ts MODULE_ACCESS.materialItems.
[Authorize(Roles = "Super Admin,IT Admin")]
[ApiController]
[Route("api/[controller]")]
public class MaterialItemController : BaseController
{
    private readonly IMaterialItemService _service;

    public MaterialItemController(IMaterialItemService service)
    {
        _service = service;
    }

    // GET: api/MaterialItem
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();

        return Success(
            result,
            "Material items retrieved successfully.");
    }

    // GET: api/MaterialItem/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFoundResponse("Material item not found.");

        return Success(
            result,
            "Material item retrieved successfully.");
    }

    // POST: api/MaterialItem
    [HttpPost]
    public async Task<IActionResult> Create(
        CreateMaterialItemRequest request)
    {
        var result = await _service.CreateAsync(request);

        return CreatedResponse(
            nameof(GetById),
            new { id = result.Id },
            result,
            "Material item created successfully.");
    }

    // PUT: api/MaterialItem/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateMaterialItemRequest request)
    {
        var result = await _service.UpdateAsync(id, request);

        if (result == null)
            return NotFoundResponse("Material item not found.");

        return Success(
            result,
            "Material item updated successfully.");
    }

    // DELETE: api/MaterialItem/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
            return NotFoundResponse("Material item not found.");

        return SuccessMessage(
            "Material item deactivated successfully.");
    }
}
