using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Department;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// "Departments" module - Super Admin/IT Admin only, matching
// frontend/lib/auth/roles.ts MODULE_ACCESS.departments.
[Authorize(Roles = "Super Admin,IT Admin")]
[ApiController]
[Route("api/[controller]")]
public class DepartmentController : BaseController
{
    private readonly IDepartmentService _service;

    public DepartmentController(IDepartmentService service)
    {
        _service = service;
    }

    // GET: api/Department
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();

        return Success(
            result,
            "Departments retrieved successfully.");
    }

    // GET: api/Department/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFoundResponse("Department not found.");

        return Success(
            result,
            "Department retrieved successfully.");
    }

    // POST: api/Department
    [HttpPost]
    public async Task<IActionResult> Create(
        CreateDepartmentRequest request)
    {
        var result = await _service.CreateAsync(request);

        return CreatedResponse(
            nameof(GetById),
            new { id = result.Id },
            result,
            "Department created successfully.");
    }

    // PUT: api/Department/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateDepartmentRequest request)
    {
        var result = await _service.UpdateAsync(id, request);

        if (result == null)
            return NotFoundResponse("Department not found.");

        return Success(
            result,
            "Department updated successfully.");
    }

    // DELETE: api/Department/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
            return NotFoundResponse("Department not found.");

        return SuccessMessage(
            "Department deactivated successfully.");
    }
}
