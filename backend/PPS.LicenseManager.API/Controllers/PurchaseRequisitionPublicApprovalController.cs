using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.PurchaseRequisition;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

/*
 * Unauthenticated endpoints backing the "approve/reject from email" flow
 * (Phase 5). Deliberately has no [Authorize] - the token in the route
 * IS the credential, matching the password-reset-link pattern already
 * described on PurchaseRequisitionApprovalToken.
 *
 * GET is read-only and side-effect free by design, even for an
 * expired/consumed token, so corporate email security scanners that
 * pre-fetch links can't accidentally decide a step - only POST (which a
 * scanner never issues) can consume a token. See
 * PublicPurchaseRequisitionApprovalResponse's comment for the full
 * rationale.
 */
[ApiController]
[Route("api/purchase-requisitions/public")]
public class PurchaseRequisitionPublicApprovalController : BaseController
{
    private readonly IPurchaseRequisitionService _service;

    public PurchaseRequisitionPublicApprovalController(IPurchaseRequisitionService service)
    {
        _service = service;
    }

    [HttpGet("{token}")]
    public async Task<IActionResult> GetByToken(string token)
    {
        var result = await _service.GetPublicApprovalViewAsync(token);

        if (result == null)
            return NotFoundResponse("This approval link is invalid.");

        return Success(result, "Purchase requisition retrieved successfully.");
    }

    [HttpPost("{token}/decision")]
    public async Task<IActionResult> DecideByToken(
        string token,
        [FromBody] DecidePurchaseRequisitionStepRequest request)
    {
        try
        {
            var result = await _service.DecideStepByTokenAsync(token, request);

            if (result == null)
                return NotFoundResponse("This approval link is invalid.");

            return Success(
                result,
                request.Approve ? "Approval recorded." : "Rejection recorded.");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }
}
