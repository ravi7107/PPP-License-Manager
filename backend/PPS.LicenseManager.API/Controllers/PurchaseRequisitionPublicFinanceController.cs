using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

/*
 * Unauthenticated endpoints backing the "Finance verifies, uploads PO,
 * confirms" flow (Phase 7) - same security model as
 * PurchaseRequisitionPublicApprovalController: deliberately no
 * [Authorize], the token in the route IS the credential. Unlike that
 * controller's token, this one is reusable rather than single-use (see
 * PurchaseRequisitionFinanceNotification.TokenHash's comment), so GET is
 * always side-effect free but POST can be called more than once too -
 * there's no reject path here, just "upload/replace the PO copy".
 */
[ApiController]
[Route("api/purchase-requisitions/public-finance")]
public class PurchaseRequisitionPublicFinanceController : BaseController
{
    private readonly IPurchaseRequisitionService _service;
    private readonly IWebHostEnvironment _environment;

    public PurchaseRequisitionPublicFinanceController(
        IPurchaseRequisitionService service,
        IWebHostEnvironment environment)
    {
        _service = service;
        _environment = environment;
    }

    // Same private, non-wwwroot location the authenticated controller
    // uses for the PDF and (now) the PO document - see
    // PurchaseRequisitionController.GetPdfStorageRootPath's comment.
    private string GetPdfStorageRootPath()
    {
        return Path.Combine(_environment.ContentRootPath, "App_Data");
    }

    [HttpGet("{token}")]
    public async Task<IActionResult> GetByToken(string token)
    {
        var result = await _service.GetPublicFinanceViewAsync(token);

        if (result == null)
            return NotFoundResponse("This Finance link is invalid.");

        return Success(result, "Purchase requisition retrieved successfully.");
    }

    [HttpPost("{token}/po")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> UploadPo(
        string token,
        IFormFile file,
        [FromForm] string? poNumber = null)
    {
        try
        {
            var result = await _service.UploadPoByTokenAsync(
                token, file, poNumber, GetPdfStorageRootPath());

            if (result == null)
                return NotFoundResponse("This Finance link is invalid.");

            return Success(result, "PO document uploaded. The requester has been notified.");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }
}
