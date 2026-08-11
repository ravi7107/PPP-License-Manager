using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.DTOs.Asset;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Common;

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
        var (isEntityRestricted, companyId) = EntityScopeHelper.Resolve(User);

        var assets = await _assetService.GetAllAsync(
            isEntityRestricted,
            companyId);

        return Ok(assets);
    }
[HttpGet("list")]
public async Task<IActionResult> GetPaged([FromQuery] AssetFilterRequest request)
{
    var result = await _assetService.GetPagedAsync(request);

    return Ok(ApiResponse<PagedResponse<AssetResponse>>.SuccessResponse(result));
}


[HttpGet("dashboard/overview")]
public async Task<IActionResult> DashboardOverview()
{
    var result = await _assetService.GetDashboardOverviewAsync();
    return Ok(result);
}

[HttpGet("dashboard/recent-assets")]
public async Task<IActionResult> RecentAssets([FromQuery] int count = 10)
{
    var result = await _assetService.GetRecentAssetsAsync(count);
    return Ok(result);
}

[HttpGet("dashboard/manufacturer-summary")]
public async Task<IActionResult> ManufacturerSummary()
{
    var result = await _assetService.GetManufacturerSummaryAsync();
    return Ok(result);
}

[HttpGet("dashboard/department-summary")]
public async Task<IActionResult> DepartmentSummary()
{
    var result = await _assetService.GetDepartmentSummaryAsync();
    return Ok(result);
}

[HttpGet("dashboard/asset-type-summary")]
public async Task<IActionResult> AssetTypeSummary()
{
    var result = await _assetService.GetAssetTypeSummaryAsync();
    return Ok(result);
}

[HttpGet("dashboard/warranty-summary")]
public async Task<IActionResult> WarrantySummary()
{
    var result = await _assetService.GetWarrantySummaryAsync();
    return Ok(result);
}

[HttpGet("dashboard")]
public async Task<IActionResult> Dashboard()
{
    return Ok(await _assetService.GetDashboardAsync());
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
        try
        {
            var deleted = await _assetService.DeleteAsync(id);

            if (!deleted)
                return NotFound();

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
