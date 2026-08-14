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

    public MaterialMovementController(IMaterialMovementService service)
    {
        _service = service;
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
}
