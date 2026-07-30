using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Availability;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AvailabilityController : ControllerBase
{
    private readonly IAvailabilityService _availabilityService;

    public AvailabilityController(
        IAvailabilityService availabilityService)
    {
        _availabilityService = availabilityService;
    }

    // GET: /api/Availability/unavailabilities
    [HttpGet("unavailabilities")]
    public async Task<IActionResult> GetUnavailabilities()
    {
        var records =
            await _availabilityService
                .GetUnavailabilitiesAsync();

        return Ok(records);
    }

    // GET: /api/Availability/unavailabilities/5
    [HttpGet("unavailabilities/{id:int}")]
    public async Task<IActionResult> GetUnavailabilityById(
        int id)
    {
        var record =
            await _availabilityService
                .GetUnavailabilityByIdAsync(id);

        if (record == null)
            return NotFound();

        return Ok(record);
    }

    // POST: /api/Availability/unavailabilities
    [HttpPost("unavailabilities")]
    public async Task<IActionResult> CreateUnavailability(
        CreateUserUnavailabilityRequest request)
    {
        var record =
            await _availabilityService
                .CreateUnavailabilityAsync(request);

        return CreatedAtAction(
            nameof(GetUnavailabilityById),
            new { id = record.Id },
            record);
    }

    // POST: /api/Availability/unavailabilities/5/cancel
    [HttpPost("unavailabilities/{id:int}/cancel")]
    public async Task<IActionResult> CancelUnavailability(
        int id,
        CancelUserUnavailabilityRequest request)
    {
        var cancelled =
            await _availabilityService
                .CancelUnavailabilityAsync(
                    id,
                    request);

        if (!cancelled)
            return NotFound();

        return Ok(new
        {
            Success = true,
            Message =
                "Unavailability period cancelled successfully."
        });
    }

    // GET: /api/Availability/available-licenses
    [HttpGet("available-licenses")]
    public async Task<IActionResult> GetAvailableLicenses()
    {
        var records =
            await _availabilityService
                .GetAvailableLicenseResourcesAsync();

        return Ok(records);
    }

    // GET: /api/Availability/reallocation-requests
    [HttpGet("reallocation-requests")]
    public async Task<IActionResult> GetReallocationRequests()
    {
        var records =
            await _availabilityService
                .GetReallocationRequestsAsync();

        return Ok(records);
    }

    // POST: /api/Availability/reallocation-requests
    [HttpPost("reallocation-requests")]
    public async Task<IActionResult> CreateReallocationRequest(
        CreateResourceReallocationRequest request)
    {
        var record =
            await _availabilityService
                .CreateReallocationRequestAsync(request);

        return Ok(record);
    }

    // POST: /api/Availability/reallocation-requests/5/return
    [HttpPost("reallocation-requests/{id:int}/return")]
    public async Task<IActionResult> ReturnReallocationToOriginalUser(
        int id,
        ReturnResourceReallocationRequest request)
    {
        var record =
            await _availabilityService
                .ReturnReallocationToOriginalUserAsync(
                    id,
                    request);

        if (record == null)
            return NotFound();

        return Ok(record);
    }

    // POST: /api/Availability/reallocation-requests/5/decision
    [HttpPost("reallocation-requests/{id:int}/decision")]
    public async Task<IActionResult> DecideReallocationRequest(
        int id,
        DecideResourceReallocationRequest request)
    {
        var record =
            await _availabilityService
                .DecideReallocationRequestAsync(
                    id,
                    request);

        if (record == null)
            return NotFound();

        return Ok(record);
    }
}
