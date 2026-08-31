using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.DTOs.ReportCenter;
using PPS.LicenseManager.API.Services.Interfaces;
using PPS.LicenseManager.API.Services.ReportCenter;

namespace PPS.LicenseManager.API.Controllers;

/*
 * Report Center - one action per verb (catalog/preview/export) shared by
 * every report the registry knows about.
 */
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Super Admin,IT Admin,Team Lead,Manager")]
public class ReportCenterController : BaseController
{
    private readonly IReportCenterService _service;

    public ReportCenterController(IReportCenterService service)
    {
        _service = service;
    }

    [HttpGet("catalog")]
    public IActionResult GetCatalog()
    {
        return Success(_service.GetCatalog());
    }

    [HttpPost("{reportId}/preview")]
    public async Task<IActionResult> Preview(string reportId, [FromBody] ReportQueryRequest request)
    {
        var (isEntityRestricted, companyId) = EntityScopeHelper.Resolve(User);

        var envelope = await _service.RunPreviewAsync(reportId, request ?? new ReportQueryRequest(), isEntityRestricted, companyId);

        if (envelope == null)
        {
            return NotFoundResponse($"Unknown report '{reportId}'.");
        }

        return Success(envelope);
    }

    [HttpPost("{reportId}/export")]
    public async Task<IActionResult> Export(string reportId, [FromBody] ReportQueryRequest request)
    {
        var (isEntityRestricted, companyId) = EntityScopeHelper.Resolve(User);

        try
        {
            var file = await _service.RunExportAsync(
                reportId,
                request ?? new ReportQueryRequest(),
                isEntityRestricted,
                companyId,
                User);

            if (file == null)
            {
                return NotFoundResponse($"Unknown report '{reportId}'.");
            }

            return File(file.Value.Bytes, file.Value.ContentType, file.Value.FileName);
        }
        catch (ReportExportTooLargeException ex)
        {
            return BadRequestResponse(ex.Message);
        }
    }
}
