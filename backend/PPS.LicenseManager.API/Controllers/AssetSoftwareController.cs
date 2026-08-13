using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.AssetSoftware;
using PPS.LicenseManager.API.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

// Was missing [Authorize] entirely. Same gap as License/LicensePurchaseController.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetSoftwareController : ControllerBase
{
    private readonly IAssetSoftwareService _service;

    public AssetSoftwareController(IAssetSoftwareService service)
    {
        _service = service;
    }

    // GET: api/AssetSoftware
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AssetSoftwareResponse>>> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(result);
    }

    // GET: api/AssetSoftware/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AssetSoftwareResponse>> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    // GET: api/AssetSoftware/asset/1
    [HttpGet("asset/{assetId:int}")]
    public async Task<ActionResult<IEnumerable<AssetSoftwareResponse>>> GetByAssetId(int assetId)
    {
        var result = await _service.GetByAssetIdAsync(assetId);
        return Ok(result);
    }

    // POST: api/AssetSoftware
    [HttpPost]
    public async Task<ActionResult<AssetSoftwareResponse>> Create(CreateAssetSoftwareRequest request)
    {
        var result = await _service.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Id },
            result);
    }

    // PUT: api/AssetSoftware/5
    [HttpPut("{id:int}")]
    public async Task<ActionResult<AssetSoftwareResponse>> Update(
        int id,
        UpdateAssetSoftwareRequest request)
    {
        var result = await _service.UpdateAsync(id, request);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    // DELETE: api/AssetSoftware/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
