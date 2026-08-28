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

    // Deliberately NOT under wwwroot (which app.UseStaticFiles() serves
    // unauthenticated) - generated PDFs live here so the only way to read
    // one back is through the authenticated GetPdf action below.
    private string GetPdfStorageRootPath()
    {
        return Path.Combine(_environment.ContentRootPath, "App_Data");
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

    // Scoped to a specific purchase requisition (rather than "candidates
    // for me, in general") because eligibility depends on the PR's own
    // company - which is set from the Department selected at Draft
    // creation, not from the requester's personal company. See
    // GetApproverCandidatesAsync's comment for why that distinction
    // matters.
    [HttpGet("{id:int}/approver-candidates")]
    public async Task<IActionResult> GetApproverCandidates(int id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.GetApproverCandidatesAsync(id, currentUserId);

            return Success(result, "Approver candidates retrieved successfully.");
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

    // Not scoped to a specific PR id (unlike approver-candidates above) -
    // the create/edit form doesn't have a saved PR id yet when a Draft is
    // first being composed. companyId is optional; when provided,
    // narrows to that company's own contacts plus org-wide ones.
    [HttpGet("initiator-candidates")]
    public async Task<IActionResult> GetInitiatorCandidates([FromQuery] int? companyId)
    {
        var result = await _service.GetInitiatorCandidatesAsync(companyId);

        return Success(result, "Initiator candidates retrieved successfully.");
    }

    // Feeds the Asset/License purchase creation forms' optional "link to a
    // Purchase Requisition" picker - every line item on an Approved PR
    // that still has remaining unfulfilled quantity. Not scoped to a
    // specific PR id, same reasoning as initiator-candidates above; open
    // to any authenticated user (class-level [Authorize]) rather than
    // further role-gated, since it exposes no more than item
    // descriptions/quantities that anyone able to create an Asset or
    // License purchase would already need to see.
    [HttpGet("available-lines")]
    public async Task<IActionResult> GetAvailableLines()
    {
        var result = await _service.GetAvailableLinesForLinkingAsync();

        return Success(result, "Available purchase requisition lines retrieved successfully.");
    }

    // Audit/reconciliation report - unlike every other endpoint in this
    // controller, this one is explicitly role-gated (matching the
    // frontend Reports module's own access level - see
    // frontend/lib/auth/roles.ts's MODULE_ACCESS.reports) rather than
    // relying on IsPrivileged()/ownership checks, since it surfaces Cost
    // figures across every PR-linked Asset/License in the whole system,
    // not just the caller's own records.
    [Authorize(Roles = "Super Admin,IT Admin,Manager")]
    [HttpGet("fulfillment-report")]
    public async Task<IActionResult> GetFulfillmentReport()
    {
        var result = await _service.GetFulfillmentReportAsync();

        return Success(result, "Fulfillment report retrieved successfully.");
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

            var result = await _service.DecideStepAsync(
                id, request, currentUserId, GetPdfStorageRootPath());

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
    // PDF (Phase 6)
    // =========================================================

    // Only the owner, an assigned approver, or a privileged user can
    // download the generated PDF - same access rule as GetById. The file
    // itself lives outside wwwroot (see GetPdfStorageRootPath), so this
    // action is the only way to read it back.
    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var file = await _service.GetPdfFileAsync(
                id, currentUserId, IsPrivileged(), GetPdfStorageRootPath());

            if (file == null)
                return NotFoundResponse(
                    "No PDF is available for this purchase requisition yet.");

            return PhysicalFile(file.Value.PhysicalPath, "application/pdf", file.Value.FileName);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    // Same access rule as DownloadPdf - only the owner, an assigned
    // approver, or a privileged user can retrieve it. Whatever Finance
    // most recently uploaded via the emailed link (see
    // PurchaseRequisitionPublicFinanceController) is what this serves;
    // 404 until Finance has uploaded anything.
    [HttpGet("{id:int}/po-document")]
    public async Task<IActionResult> DownloadPoDocument(int id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var file = await _service.GetPoDocumentFileAsync(
                id, currentUserId, IsPrivileged(), GetPdfStorageRootPath());

            if (file == null)
                return NotFoundResponse(
                    "No PO document has been uploaded for this purchase requisition yet.");

            return PhysicalFile(file.Value.PhysicalPath, "application/octet-stream", file.Value.FileName);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    // Same access rule as DownloadPoDocument, but for one specific past
    // upload from PoUploadHistory rather than always "whatever's current" -
    // lets the PR detail view's upload-history list download an older PO
    // copy after a later revision has overwritten the header.
    [HttpGet("{id:int}/po-history/{poUploadId:int}/document")]
    public async Task<IActionResult> DownloadPoUploadHistoryDocument(int id, int poUploadId)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var file = await _service.GetPoUploadHistoryDocumentAsync(
                id, poUploadId, currentUserId, IsPrivileged(), GetPdfStorageRootPath());

            if (file == null)
                return NotFoundResponse("That PO document could not be found.");

            return PhysicalFile(file.Value.PhysicalPath, "application/octet-stream", file.Value.FileName);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }


    // =========================================================
    // INVOICES (Phase 7)
    // =========================================================

    // Authenticated in-app upload, independent of Material Movement -
    // covers hardware PRs (optionally tagged to a receive event via
    // materialMovementReceiptId) and software-only PRs alike (no Asset, no
    // Movement, but still invoiced against their PO).
    [HttpPost("{id:int}/invoices")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> UploadInvoice(
        int id,
        IFormFile file,
        [FromForm] string? invoiceNumber = null,
        [FromForm] DateTime? invoiceDate = null,
        [FromForm] decimal? invoiceAmount = null,
        [FromForm] int? materialMovementReceiptId = null,
        [FromForm] string? notes = null)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.UploadInvoiceAsync(
                id, file, invoiceNumber, invoiceDate, invoiceAmount,
                materialMovementReceiptId, notes, currentUserId, IsPrivileged(),
                GetPdfStorageRootPath());

            return Success(result, "Invoice uploaded.");
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

    [HttpGet("{id:int}/invoices")]
    public async Task<IActionResult> GetInvoices(int id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.GetInvoicesAsync(id, currentUserId, IsPrivileged());

            return Success(result, "Invoices retrieved successfully.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }

    // Same access rule as DownloadPoDocument, for one specific invoice's
    // uploaded document.
    [HttpGet("{id:int}/invoices/{invoiceId:int}/document")]
    public async Task<IActionResult> DownloadInvoiceDocument(int id, int invoiceId)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var file = await _service.GetInvoiceDocumentAsync(
                id, invoiceId, currentUserId, IsPrivileged(), GetPdfStorageRootPath());

            if (file == null)
                return NotFoundResponse("That invoice document could not be found.");

            return PhysicalFile(file.Value.PhysicalPath, "application/octet-stream", file.Value.FileName);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
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


    // =========================================================
    // REVISIONS
    // =========================================================

    // Owner-only, same style as Submit/Update/Delete above - the service
    // layer's own check (Status == "Approved") is the real gate; ownership
    // just decides who's allowed to ask for one.
    [HttpPost("{id:int}/revise")]
    public async Task<IActionResult> CreateRevision(int id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.CreateRevisionAsync(id, currentUserId);

            return CreatedResponse(
                nameof(GetById),
                new { id = result.Id },
                result,
                "Revision created as a new draft.");
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
