using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Asset;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetController : ControllerBase
{
    private readonly IAssetService _assetService;

    public AssetController(IAssetService assetService)
    {
        _assetService = assetService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var assets = await _assetService.GetAllAsync();
        return Ok(assets);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var asset = await _assetService.GetByIdAsync(id);

        if (asset == null)
            return NotFound();

        return Ok(asset);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAssetRequest request)
    {
        var asset = await _assetService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, asset);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateAssetRequest request)
    {
        var asset = await _assetService.UpdateAsync(id, request);

        if (asset == null)
            return NotFound();

        return Ok(asset);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _assetService.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
