using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.PurchaseRequisition;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Manages the standalone Initiator/Approver contact list for the Purchase
// Requisition module - people identified only by name + email (Gmail,
// Office 365, or any other domain), not tied to a system login. Reads are
// open to any authenticated PR user (needed for the submit-flow candidate
// picker); writes are restricted to Super Admin/IT Admin, same audience as
// Department/Vendor management.
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PurchaseRequisitionContactController : BaseController
{
    private readonly IPurchaseRequisitionContactService _service;

    public PurchaseRequisitionContactController(
        IPurchaseRequisitionContactService service)
    {
        _service = service;
    }

    private bool IsPrivileged()
    {
        return User.IsInRole("Super Admin") || User.IsInRole("IT Admin");
    }

    private int? GetCurrentUserId()
    {
        var value = User.FindFirst("UserId")?.Value;

        return int.TryParse(value, out var userId) ? userId : null;
    }

    // GET: api/PurchaseRequisitionContact?contactType=Approver&activeOnly=true
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? contactType,
        [FromQuery] bool activeOnly = false)
    {
        var result = await _service.GetAllAsync(contactType, activeOnly);

        return Success(result, "Contacts retrieved successfully.");
    }

    // GET: api/PurchaseRequisitionContact/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFoundResponse("Contact not found.");

        return Success(result, "Contact retrieved successfully.");
    }

    // POST: api/PurchaseRequisitionContact
    [HttpPost]
    public async Task<IActionResult> Create(
        CreatePurchaseRequisitionContactRequest request)
    {
        if (!IsPrivileged())
            return BadRequestResponse(
                "Only Super Admin/IT Admin can manage the contact list.");

        var result = await _service.CreateAsync(request, GetCurrentUserId());

        return CreatedResponse(
            nameof(GetById),
            new { id = result.Id },
            result,
            "Contact created successfully.");
    }

    // PUT: api/PurchaseRequisitionContact/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdatePurchaseRequisitionContactRequest request)
    {
        if (!IsPrivileged())
            return BadRequestResponse(
                "Only Super Admin/IT Admin can manage the contact list.");

        var result = await _service.UpdateAsync(id, request);

        if (result == null)
            return NotFoundResponse("Contact not found.");

        return Success(result, "Contact updated successfully.");
    }

    // DELETE: api/PurchaseRequisitionContact/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!IsPrivileged())
            return BadRequestResponse(
                "Only Super Admin/IT Admin can manage the contact list.");

        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
            return NotFoundResponse("Contact not found.");

        return SuccessMessage("Contact deactivated successfully.");
    }
}
