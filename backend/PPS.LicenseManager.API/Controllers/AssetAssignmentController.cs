using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.AssetAssignment;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetAssignmentController : ControllerBase
{
    private readonly IAssetAssignmentService _service;

    public AssetAssignmentController(
        IAssetAssignmentService service)
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
    // CURRENT ASSIGNMENTS
    // =========================================================

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent()
    {
        var result =
            await _service.GetCurrentAsync();

        return Ok(result);
    }


    // =========================================================
    // ASSIGNMENT BY ID
    // =========================================================

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result =
            await _service.GetByIdAsync(id);

        if (result == null)
        {
            return NotFound(new
            {
                message = "Hardware assignment not found."
            });
        }

        return Ok(result);
    }


    // =========================================================
    // ASSET HISTORY
    // =========================================================

    [HttpGet("asset/{assetId:int}/history")]
    public async Task<IActionResult> GetAssetHistory(
        int assetId)
    {
        var result =
            await _service.GetHistoryByAssetIdAsync(
                assetId);

        return Ok(result);
    }


    // =========================================================
    // USER ASSIGNMENTS
    // =========================================================

    [HttpGet("user/{userId:int}")]
    public async Task<IActionResult> GetByUser(
        int userId)
    {
        var result =
            await _service.GetByUserIdAsync(userId);

        return Ok(result);
    }


    // =========================================================
    // ASSIGN HARDWARE
    // =========================================================

    [HttpPost("assign")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> Assign(
        [FromBody] AssignAssetRequest request)
    {
        try
        {
            var currentUserId =
                GetCurrentUserId();

            var result =
                await _service.AssignAsync(
                    request,
                    currentUserId);

            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }


    // =========================================================
    // TRANSFER HARDWARE
    // =========================================================

    [HttpPost("{id:int}/transfer")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> Transfer(
        int id,
        [FromBody] TransferAssetRequest request)
    {
        try
        {
            var currentUserId =
                GetCurrentUserId();

            var result =
                await _service.TransferAsync(
                    id,
                    request,
                    currentUserId);

            if (result == null)
            {
                return NotFound(new
                {
                    message = "Hardware assignment not found."
                });
            }

            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }


    // =========================================================
    // RETURN HARDWARE
    // =========================================================

    [HttpPost("{id:int}/return")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> Return(
        int id,
        [FromBody] ReturnAssetRequest request)
    {
        try
        {
            var result =
                await _service.ReturnAsync(
                    id,
                    request);

            if (!result)
            {
                return NotFound(new
                {
                    message = "Hardware assignment not found."
                });
            }

            return Ok(new
            {
                message =
                    "Hardware returned successfully."
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }
}
