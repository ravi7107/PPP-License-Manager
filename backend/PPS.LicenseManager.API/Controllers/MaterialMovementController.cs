using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.MaterialMovement;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MaterialMovementController : BaseController
{
    private readonly IMaterialMovementService _service;
    private readonly IWebHostEnvironment _environment;

    public MaterialMovementController(
        IMaterialMovementService service,
        IWebHostEnvironment environment)
    {
        _service = service;
        _environment = environment;
    }

    // Deliberately NOT under wwwroot (which app.UseStaticFiles() serves
    // unauthenticated) - same convention as
    // PurchaseRequisitionController.GetPdfStorageRootPath.
    private string GetPdfStorageRootPath()
    {
        return Path.Combine(_environment.ContentRootPath, "App_Data");
    }

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

    private string? GetClientIpAddress()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    // =========================================================
    // MY MOVEMENTS
    // =========================================================

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var currentUserId = GetCurrentUserId();

        var result = await _service.GetMineAsync(currentUserId);

        return Success(result, "Movements retrieved successfully.");
    }

    // =========================================================
    // ALL MOVEMENTS (privileged only)
    // =========================================================

    [HttpGet]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();

        return Success(result, "Movements retrieved successfully.");
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
                return NotFoundResponse("Movement not found.");

            return Success(result, "Movement retrieved successfully.");
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
        [FromBody] SaveMaterialMovementRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.CreateDraftAsync(
                request, currentUserId, GetClientIpAddress());

            return CreatedResponse(
                nameof(GetById),
                new { id = result.Id },
                result,
                "Movement draft created.");
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
        [FromBody] SaveMaterialMovementRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.UpdateDraftAsync(
                id, request, currentUserId, GetClientIpAddress());

            if (result == null)
                return NotFoundResponse("Movement not found.");

            return Success(result, "Movement draft updated.");
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
                id, currentUserId, GetClientIpAddress());

            if (!deleted)
                return NotFoundResponse("Movement not found.");

            return SuccessMessage("Movement draft deleted.");
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
    public async Task<IActionResult> Submit(int id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.SubmitAsync(
                id, currentUserId, GetClientIpAddress());

            if (result == null)
                return NotFoundResponse("Movement not found.");

            return Success(result, "Movement submitted for approval.");
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
    // APPROVE / REJECT
    // =========================================================

    [HttpGet("pending-my-approval")]
    public async Task<IActionResult> GetPendingMyApproval()
    {
        var currentUserId = GetCurrentUserId();

        var result = await _service.GetPendingMyApprovalAsync(currentUserId);

        return Success(result, "Pending approvals retrieved successfully.");
    }

    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(
        int id,
        [FromBody] DecideMaterialMovementRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.ApproveAsync(
                id, currentUserId, request, GetClientIpAddress());

            if (result == null)
                return NotFoundResponse("Movement not found.");

            return Success(result, "Movement approved.");
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

    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(
        int id,
        [FromBody] DecideMaterialMovementRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.RejectAsync(
                id, currentUserId, request, GetClientIpAddress());

            if (result == null)
                return NotFoundResponse("Movement not found.");

            return Success(result, "Movement rejected.");
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
    // DISPATCH / GATE PASS
    // =========================================================

    // Dispatching is a warehouse/logistics action, same admin-level
    // access as GetAll (privileged only) - not every user who can submit
    // a movement should also be able to mark it dispatched.
    [HttpPost("{id:int}/dispatch")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> Dispatch(
        int id,
        [FromBody] DispatchMaterialMovementRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.DispatchAsync(
                id, currentUserId, request, GetClientIpAddress());

            if (result == null)
                return NotFoundResponse("Movement not found.");

            return Success(result, "Movement dispatched.");
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

    // Owner, assigned approver, or privileged user - same access rule as
    // GetById, enforced inside GetByIdAsync (which GetGatePassPdfFileAsync
    // doesn't duplicate; it only exists once a movement is Dispatched,
    // reached via a movement that already passed that same check when
    // viewed). Deliberately not gated to Roles here so the requester can
    // download their own gate pass too, not just admins.
    [HttpGet("{id:int}/gate-pass-pdf")]
    public async Task<IActionResult> DownloadGatePassPdf(int id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            // GetByIdAsync's access check (owner/assigned approver/
            // privileged) doubles as the authorization gate here - a
            // Dispatched movement is always past its approval stage, so
            // "assigned approver" no longer applies, but "owner" and
            // "privileged" still do.
            var movement = await _service.GetByIdAsync(id, currentUserId, IsPrivileged());

            if (movement == null)
                return NotFoundResponse("Movement not found.");

            var file = await _service.GetGatePassPdfFileAsync(id, GetPdfStorageRootPath());

            if (file == null)
                return NotFoundResponse(
                    "No gate pass is available for this movement yet.");

            return PhysicalFile(file.Value.PhysicalPath, "application/pdf", file.Value.FileName);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    // =========================================================
    // RGP (RETURNABLE GATE PASS) TRACKING
    // =========================================================

    // Same admin-level access as GetAll/Dispatch - this is a company-wide
    // logistics view (every outstanding RGP, not just the caller's own),
    // not a "my movements" scope.
    [HttpGet("rgp-tracking")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> GetRgpTracking()
    {
        var result = await _service.GetRgpTrackingAsync();

        return Success(result, "RGP tracking retrieved successfully.");
    }

    // Same admin-level access as Dispatch - marking material physically
    // returned is a logistics/security action, not something the original
    // requester self-certifies.
    [HttpPost("{id:int}/mark-returned")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> MarkReturned(
        int id,
        [FromBody] MarkReturnedRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var result = await _service.MarkReturnedAsync(
                id, currentUserId, request.Remarks, GetClientIpAddress());

            if (result == null)
                return NotFoundResponse("Movement not found.");

            return Success(result, "Movement marked as returned.");
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
