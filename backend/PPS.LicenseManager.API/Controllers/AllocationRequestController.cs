using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.AllocationRequest;
using PPS.LicenseManager.API.Services.Interfaces;
using PPS.LicenseManager.API.DTOs.AllocationRequest;


namespace PPS.LicenseManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AllocationRequestController : ControllerBase
{
    private readonly IAllocationRequestService _service;

    public AllocationRequestController(IAllocationRequestService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
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
    public async Task<IActionResult> Create(CreateAllocationRequestRequest request)
    {
        var result = await _service.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Id },
            result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        UpdateAllocationRequestRequest request)
    {
        var result = await _service.UpdateAsync(id, request);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }

[HttpPost("{id:int}/approve")]
public async Task<IActionResult> Approve(
    int id,
    ApproveAllocationRequestRequest request)
{
    var result = await _service.ApproveAsync(id, request);

    if (result == null)
        return NotFound();

    return Ok(result);
}

	[HttpPost("{id:int}/reject")]
public async Task<IActionResult> Reject(
    int id,
    RejectAllocationRequestRequest request)
{
    var result = await _service.RejectAsync(id, request);

    if (result == null)
        return NotFound();

    return Ok(result);
}

}
