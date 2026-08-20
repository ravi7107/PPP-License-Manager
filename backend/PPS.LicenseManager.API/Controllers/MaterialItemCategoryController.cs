using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.MaterialItemCategory;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Material Movement master data - Super Admin/IT Admin only, matching
// frontend/lib/auth/roles.ts MODULE_ACCESS.materialItemCategories. Was
// bare [Authorize], leaving create/edit/delete open to any authenticated
// user.
[Authorize(Roles = "Super Admin,IT Admin")]
[ApiController]
[Route("api/[controller]")]
public class MaterialItemCategoryController : BaseController
{
    private readonly IMaterialItemCategoryService _service;

    public MaterialItemCategoryController(IMaterialItemCategoryService service)
    {
        _service = service;
    }

    // GET: api/MaterialItemCategory
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();

        return Success(
            result,
            "Material item categories retrieved successfully.");
    }

    // GET: api/MaterialItemCategory/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFoundResponse("Material item category not found.");

        return Success(
            result,
            "Material item category retrieved successfully.");
    }

    // POST: api/MaterialItemCategory
    [HttpPost]
    public async Task<IActionResult> Create(
        CreateMaterialItemCategoryRequest request)
    {
        var result = await _service.CreateAsync(request);

        return CreatedResponse(
            nameof(GetById),
            new { id = result.Id },
            result,
            "Material item category created successfully.");
    }

    // PUT: api/MaterialItemCategory/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateMaterialItemCategoryRequest request)
    {
        var result = await _service.UpdateAsync(id, request);

        if (result == null)
            return NotFoundResponse("Material item category not found.");

        return Success(
            result,
            "Material item category updated successfully.");
    }

    // DELETE: api/MaterialItemCategory/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
            return NotFoundResponse("Material item category not found.");

        return SuccessMessage(
            "Material item category deactivated successfully.");
    }
}
