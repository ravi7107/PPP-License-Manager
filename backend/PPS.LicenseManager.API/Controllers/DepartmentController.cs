using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Department;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[Authorize]
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
    //
    // Reads stay open to any authenticated user - department names are
    // read as a lookup/filter by many pages outside the Departments admin
    // module itself (Office Locations, Users, Licenses, Material
    // Movement, and a couple of request-loading helpers), across roles
    // well beyond Super Admin/IT Admin. Restricting this class-wide (as
    // it briefly was) broke every one of those pages for any other role.
    // Only Create/Update/Delete below are restricted to the Departments
    // module's own audience (frontend/lib/auth/roles.ts
    // MODULE_ACCESS.departments) - matching the pattern already used
    // correctly by AssetController/ResourceAllocationController.
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
    [Authorize(Roles = "Super Admin,IT Admin")]
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
    [Authorize(Roles = "Super Admin,IT Admin")]
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
    [Authorize(Roles = "Super Admin,IT Admin")]
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
