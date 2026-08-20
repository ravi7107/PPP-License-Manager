using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.DTOs.Utilization;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Controllers;

/*
 * Software License Utilization & Analytics module - upload, preview,
 * column mapping, and processing. Same audience as the license/cost
 * strategy modules (Super Admin, IT Admin, Manager); mutating actions are
 * further restricted to Super Admin/IT Admin (a Manager can view uploads
 * and analysis but not upload/reprocess/deactivate a batch) - matching
 * the read/write split already established on RoleModuleAccessController.
 */
[Authorize(Roles = "Super Admin,IT Admin,Manager")]
[ApiController]
[Route("api/[controller]")]
public class UtilizationUploadController : BaseController
{
    private readonly IUtilizationUploadService _service;
    private readonly IWebHostEnvironment _environment;

    public UtilizationUploadController(
        IUtilizationUploadService service,
        IWebHostEnvironment environment)
    {
        _service = service;
        _environment = environment;
    }

    private int GetCurrentUserId()
    {
        var value = User.FindFirst("UserId")?.Value;

        if (string.IsNullOrWhiteSpace(value) || !int.TryParse(value, out var userId))
            throw new UnauthorizedAccessException(
                "Authenticated user ID is missing from the token.");

        return userId;
    }

    // Deliberately NOT under wwwroot (which app.UseStaticFiles() serves
    // unauthenticated) - uploaded utilization reports may be sensitive,
    // so they're only readable back through GetFile's authenticated
    // download action, same pattern as the PR PDF/PO-copy storage.
    private string GetStorageRootPath()
    {
        return Path.Combine(_environment.ContentRootPath, "App_Data");
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var batches = await _service.GetAllAsync();
        return Success(batches, "Uploads retrieved successfully.");
    }

    [HttpGet("mapping-profiles")]
    public async Task<IActionResult> GetMappingProfiles()
    {
        var profiles = await _service.GetMappingProfilesAsync();
        return Success(profiles, "Mapping profiles retrieved successfully.");
    }

    [HttpPost]
    [Authorize(Roles = "Super Admin,IT Admin")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile file,
        [FromForm] UploadUtilizationBatchRequest request)
    {
        try
        {
            var result = await _service.UploadAsync(
                file, request, GetCurrentUserId(), GetStorageRootPath());

            if (result.DuplicateOfBatchId.HasValue)
                return Success(result,
                    $"This exact file was already uploaded as batch #{result.DuplicateOfBatchId}. " +
                    "Resubmit with forceUpload=true to upload it again anyway.");

            return Success(result, "File uploaded successfully.");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    [HttpGet("{id}/preview")]
    public async Task<IActionResult> GetPreview(int id)
    {
        try
        {
            var preview = await _service.GetPreviewAsync(id);
            return Success(preview, "Preview retrieved successfully.");
        }
        catch (InvalidOperationException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }

    [HttpPost("{id}/mapping")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> SaveMapping(int id, [FromBody] SaveUtilizationMappingRequest request)
    {
        try
        {
            var result = await _service.SaveMappingAsync(id, request, GetCurrentUserId());
            return Success(result, "Column mapping saved successfully.");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    [HttpPost("{id}/process")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> Process(int id)
    {
        try
        {
            var result = await _service.ProcessAsync(id, GetCurrentUserId());
            return Success(result, "Upload processed successfully.");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }

    [HttpGet("{id}/file")]
    public async Task<IActionResult> GetFile(int id)
    {
        try
        {
            var (stream, contentType, fileName) =
                await _service.GetFileAsync(id, GetStorageRootPath());

            return File(stream, contentType, fileName);
        }
        catch (InvalidOperationException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Super Admin,IT Admin")]
    public async Task<IActionResult> Deactivate(int id)
    {
        try
        {
            await _service.DeactivateAsync(id, GetCurrentUserId());
            return SuccessMessage("Upload removed from analysis.");
        }
        catch (InvalidOperationException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }
}
