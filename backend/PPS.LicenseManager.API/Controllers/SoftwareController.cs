using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Software;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SoftwareController : ControllerBase
{
    private readonly ISoftwareService _softwareService;

    public SoftwareController(ISoftwareService softwareService)
    {
        _softwareService = softwareService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var software = await _softwareService.GetAllAsync();
        return Ok(software);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var software = await _softwareService.GetByIdAsync(id);

        if (software == null)
            return NotFound();

        return Ok(software);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSoftwareRequest request)
    {
        var software = await _softwareService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = software.Id }, software);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateSoftwareRequest request)
    {
        var updated = await _softwareService.UpdateAsync(id, request);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _softwareService.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
