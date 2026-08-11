using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.PurchaseRequisition;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PurchaseRequisitionController : BaseController
{
    private readonly IPurchaseRequisitionService _service;
    private readonly IWebHostEnvironment _environment;

    public PurchaseRequisitionController(
        IPurchaseRequisitionService service,
        IWebHostEnvironment environment)
    {
        _service = service;
        _environment = environment;
    }


    // =========================================================
    // AUTHENTICATED USER
    // =========================================================

    private int GetCurrentUserId()
    {
        var value = User.FindFirst("UserId")?.Value;

        if (string.IsNullOrWhiteSpace(value) || !int.TryParse(value, out var userId))
            throw new UnauthorizedAccessException(
                "Authenticated user ID is missing from the token.");

        return userId;
    }

    private bool IsPrivileged()
    {
        return User.IsInRole("Super Admin") || User.IsInRole("IT Admin");
    }

    private string GetWebRootPath()
    {
        return _environment.WebRootPath
            ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
    }


    // =========================================================
    // MY PURCHASE REQUISITIONS
    // =========================================================

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var currentUserId = GetCurrentUserId();

        var result = await _service.GetMineAsync(currentUserId);

        return Success(result, "Purchase requisitions retrieved successfully.");
    }


    // =========================================================
    // APPROVER CANDIDATES (for the Submit dialog)
    // =========================================================

    [HttpGet("approver-candidates")]
    public async Task<IActionResult> GetApproverCandidates()
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.GetApproverCandidatesAsync(currentUserId);

            return Success(result, "Approver candidates retrieved successfully.");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }


    // =========================================================
    // GET BY ID
    // =========================================================

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.GetByIdAsync(
                id, currentUserId, IsPrivileged());

            if (result == null)
                return NotFoundResponse("Purchase requisition not found.");

            return Success(result, "Purchase requisition retrieved successfully.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }


    // =========================================================
    // CREATE DRAFT
    // =========================================================

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] SavePurchaseRequisitionRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.CreateDraftAsync(request, currentUserId);

            return CreatedResponse(
                nameof(GetById),
                new { id = result.Id },
                result,
                "Purchase requisition draft created.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }


    // =========================================================
    // UPDATE DRAFT
    // =========================================================

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] SavePurchaseRequisitionRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.UpdateDraftAsync(id, request, currentUserId);

            if (result == null)
                return NotFoundResponse("Purchase requisition not found.");

            return Success(result, "Purchase requisition draft updated.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }


    // =========================================================
    // DELETE DRAFT
    // =========================================================

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var deleted = await _service.DeleteDraftAsync(
                id, currentUserId, GetWebRootPath());

            if (!deleted)
                return NotFoundResponse("Purchase requisition not found.");

            return SuccessMessage("Purchase requisition draft deleted.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }


    // =========================================================
    // ATTACHMENTS
    // =========================================================

    [HttpPost("{id:int}/attachments")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> UploadAttachment(
        int id,
        IFormFile file,
        [FromForm] string attachmentType = "VendorQuotation")
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.UploadAttachmentAsync(
                id, file, attachmentType, currentUserId, GetWebRootPath());

            return Success(result, "Attachment uploaded.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    [HttpDelete("{id:int}/attachments/{attachmentId:int}")]
    public async Task<IActionResult> DeleteAttachment(int id, int attachmentId)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var deleted = await _service.DeleteAttachmentAsync(
                id, attachmentId, currentUserId, GetWebRootPath());

            if (!deleted)
                return NotFoundResponse("Attachment not found.");

            return SuccessMessage("Attachment removed.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }


    // =========================================================
    // PENDING APPROVALS (Approval Engine)
    // =========================================================

    [HttpGet("pending-approvals")]
    public async Task<IActionResult> GetPendingApprovals()
    {
        var currentUserId = GetCurrentUserId();

        var result = await _service.GetPendingApprovalsAsync(currentUserId);

        return Success(result, "Pending approvals retrieved successfully.");
    }

    [HttpPost("{id:int}/decision")]
    public async Task<IActionResult> DecideStep(
        int id,
        [FromBody] DecidePurchaseRequisitionStepRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.DecideStepAsync(id, request, currentUserId);

            if (result == null)
                return NotFoundResponse("Purchase requisition not found.");

            return Success(
                result,
                request.Approve ? "Approval recorded." : "Rejection recorded.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }


    // =========================================================
    // SUBMIT
    // =========================================================

    [HttpPost("{id:int}/submit")]
    public async Task<IActionResult> Submit(
        int id,
        [FromBody] SubmitPurchaseRequisitionRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.SubmitAsync(id, request, currentUserId);

            if (result == null)
                return NotFoundResponse("Purchase requisition not found.");

            return Success(result, "Purchase requisition submitted for approval.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }
}
