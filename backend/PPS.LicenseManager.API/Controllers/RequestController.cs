using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Request;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RequestController : ControllerBase
{
    private readonly IRequestService _service;

    public RequestController(IRequestService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? requesterId,
        [FromQuery] string? status)
    {
        var result = await _service.GetAllAsync(requesterId, status);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateRequestRequest request)
    {
        try
        {
            var result = await _service.CreateAsync(request);

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, [FromBody] CancelRequestBody body)
    {
        try
        {
            var result = await _service.CancelAsync(id, body.ActorUserId);

            if (result == null)
                return NotFound();

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, DecideRequestRequest request)
    {
        try
        {
            var result = await _service.ApproveAsync(id, request);

            if (result == null)
                return NotFound();

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, DecideRequestRequest request)
    {
        try
        {
            var result = await _service.RejectAsync(id, request);

            if (result == null)
                return NotFound();

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}/approvals")]
    public async Task<IActionResult> GetApprovalHistory(int id)
    {
        var result = await _service.GetApprovalHistoryAsync(id);
        return Ok(result);
    }
}

public class CancelRequestBody
{
    public int ActorUserId { get; set; }
}
