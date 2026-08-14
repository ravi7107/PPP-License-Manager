using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.MaterialCostCenter;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MaterialCostCenterController : BaseController
{
    private readonly IMaterialCostCenterService _service;

    public MaterialCostCenterController(IMaterialCostCenterService service)
    {
        _service = service;
    }

    // GET: api/MaterialCostCenter
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();

        return Success(
            result,
            "Material cost centers retrieved successfully.");
    }

    // GET: api/MaterialCostCenter/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFoundResponse("Material cost center not found.");

        return Success(
            result,
            "Material cost center retrieved successfully.");
    }

    // POST: api/MaterialCostCenter
    [HttpPost]
    public async Task<IActionResult> Create(
        CreateMaterialCostCenterRequest request)
    {
        var result = await _service.CreateAsync(request);

        return CreatedResponse(
            nameof(GetById),
            new { id = result.Id },
            result,
            "Material cost center created successfully.");
    }

    // PUT: api/MaterialCostCenter/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateMaterialCostCenterRequest request)
    {
        var result = await _service.UpdateAsync(id, request);

        if (result == null)
            return NotFoundResponse("Material cost center not found.");

        return Success(
            result,
            "Material cost center updated successfully.");
    }

    // DELETE: api/MaterialCostCenter/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
            return NotFoundResponse("Material cost center not found.");

        return SuccessMessage(
            "Material cost center deactivated successfully.");
    }
}
