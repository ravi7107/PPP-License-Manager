using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.DTOs.AssetReallocation;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetReallocationRequestController : ControllerBase
{
    private readonly IAssetReallocationRequestService _service;

    public AssetReallocationRequestController(
        IAssetReallocationRequestService service)
    {
        _service = service;
    }


    // =========================================================
    // AUTHENTICATED USER
    // =========================================================

    private int GetCurrentUserId()
    {
        var value = User.FindFirst("UserId")?.Value;

        if (string.IsNullOrWhiteSpace(value) ||
            !int.TryParse(value, out var userId))
        {
            throw new UnauthorizedAccessException(
                "Authenticated user ID is missing from the token.");
        }

        return userId;
    }


    // =========================================================
    // MY REQUESTS (Team Lead / Manager)
    // =========================================================

    [HttpGet("mine")]
    [Authorize(Roles = "Team Lead,Manager")]
    public async Task<IActionResult> GetMine()
    {
        var currentUserId = GetCurrentUserId();

        var result = await _service.GetMineAsync(currentUserId);

        return Ok(result);
    }


    // =========================================================
    // PENDING REQUESTS (Super Admin / IT Admin approval queue)
    // =========================================================

    [HttpGet("pending")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> GetPending()
    {
        var result = await _service.GetPendingAsync();

        return Ok(result);
    }


    // =========================================================
    // REQUEST BY ID
    // =========================================================

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
        {
            return NotFound(new
            {
                message = "Reallocation request not found."
            });
        }

        return Ok(result);
    }


    // =========================================================
    // CREATE (Team Lead / Manager)
    // =========================================================

    [HttpPost]
    [Authorize(Roles = "Team Lead,Manager")]
    public async Task<IActionResult> Create(
        [FromBody] CreateReallocationRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var (isRestricted, companyId) = EntityScopeHelper.Resolve(User);

            var result = await _service.CreateAsync(
                request,
                currentUserId,
                isRestricted,
                companyId);

            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }


    // =========================================================
    // DECIDE (Super Admin / IT Admin - routed to the caller's own side)
    // =========================================================

    [HttpPost("{id:int}/decision")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> Decide(
        int id,
        [FromBody] DecideReallocationRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            // A user can hold both roles in theory; Super Admin takes
            // precedence as "the" Admin decision in that case, and they'd
            // still need a separate IT Admin account to supply the IT side.
            var isAdminSide = User.IsInRole("Super Admin");

            var result = isAdminSide
                ? await _service.DecideAsAdminAsync(
                    id,
                    request,
                    currentUserId)
                : await _service.DecideAsItAsync(
                    id,
                    request,
                    currentUserId);

            if (result == null)
            {
                return NotFound(new
                {
                    message = "Reallocation request not found."
                });
            }

            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }


    // =========================================================
    // CANCEL (Team Lead / Manager withdraws their own pending request)
    // =========================================================

    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = "Team Lead,Manager")]
    public async Task<IActionResult> Cancel(int id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var cancelled = await _service.CancelAsync(
                id,
                currentUserId);

            if (!cancelled)
            {
                return NotFound(new
                {
                    message = "Reallocation request not found."
                });
            }

            return Ok(new
            {
                message = "Reallocation request cancelled."
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
