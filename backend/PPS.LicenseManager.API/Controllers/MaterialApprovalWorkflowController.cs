using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.MaterialApprovalWorkflow;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// The approval matrix config screen - Super Admin/IT Admin only, matching
// frontend/lib/auth/roles.ts MODULE_ACCESS.materialApprovalWorkflows.
[Authorize(Roles = "Super Admin,IT Admin")]
[ApiController]
[Route("api/[controller]")]
public class MaterialApprovalWorkflowController : BaseController
{
    private readonly IMaterialApprovalWorkflowService _service;

    public MaterialApprovalWorkflowController(IMaterialApprovalWorkflowService service)
    {
        _service = service;
    }

    // GET: api/MaterialApprovalWorkflow
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();

        return Success(
            result,
            "Material approval workflows retrieved successfully.");
    }

    // GET: api/MaterialApprovalWorkflow/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFoundResponse("Material approval workflow not found.");

        return Success(
            result,
            "Material approval workflow retrieved successfully.");
    }

    // POST: api/MaterialApprovalWorkflow
    [HttpPost]
    public async Task<IActionResult> Create(
        CreateMaterialApprovalWorkflowRequest request)
    {
        var result = await _service.CreateAsync(request);

        return CreatedResponse(
            nameof(GetById),
            new { id = result.Id },
            result,
            "Material approval workflow created successfully.");
    }

    // PUT: api/MaterialApprovalWorkflow/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateMaterialApprovalWorkflowRequest request)
    {
        var result = await _service.UpdateAsync(id, request);

        if (result == null)
            return NotFoundResponse("Material approval workflow not found.");

        return Success(
            result,
            "Material approval workflow updated successfully.");
    }

    // DELETE: api/MaterialApprovalWorkflow/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
            return NotFoundResponse("Material approval workflow not found.");

        return SuccessMessage(
            "Material approval workflow deactivated successfully.");
    }
}
