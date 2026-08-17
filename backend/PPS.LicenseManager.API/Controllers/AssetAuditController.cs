using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.AssetAudit;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Backs the PPS Asset Scanner mobile app's physical audit/stocktake
// workflow. Starting, scanning into, and completing a session are
// gated the same way AssetAssignmentController gates Transfer - these
// are physical-asset operations, not read-only lookups. Viewing a
// session (GET) is open to any authenticated role, same as
// Company/Department/OfficeLocation.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetAuditController : ControllerBase
{
    private readonly IAssetAuditService _service;

    public AssetAuditController(IAssetAuditService service)
    {
        _service = service;
    }

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

    [HttpGet]
    public async Task<IActionResult> GetRecent(
        [FromQuery] string? status,
        [FromQuery] int take = 20)
    {
        var result = await _service.GetRecentAsync(status, take);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetAsync(id);

        if (result == null)
            return NotFound(new { message = "Audit session not found." });

        return Ok(result);
    }

    [Authorize(Roles = "Super Admin,IT Admin")]
    [HttpPost("start")]
    public async Task<IActionResult> Start(StartAssetAuditRequest request)
    {
        try
        {
            var result = await _service.StartAsync(request, GetCurrentUserId());
            return CreatedAtAction(nameof(GetById), new { id = result.Audit.Id }, result);
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

    [Authorize(Roles = "Super Admin,IT Admin")]
    [HttpPost("{id:int}/scan")]
    public async Task<IActionResult> Scan(int id, RecordAssetAuditScanRequest request)
    {
        try
        {
            var result = await _service.RecordScanAsync(id, request, GetCurrentUserId());

            if (result == null)
            {
                return NotFound(new
                {
                    message = "Audit session not found, or no asset matches this code."
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

    [Authorize(Roles = "Super Admin,IT Admin")]
    [HttpPost("{id:int}/complete")]
    public async Task<IActionResult> Complete(int id, CompleteAssetAuditRequest request)
    {
        try
        {
            var result = await _service.CompleteAsync(id, request, GetCurrentUserId());

            if (result == null)
                return NotFound(new { message = "Audit session not found." });

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
}
