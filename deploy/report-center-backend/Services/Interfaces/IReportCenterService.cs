using System.Security.Claims;
using PPS.LicenseManager.API.DTOs.ReportCenter;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IReportCenterService
{
    List<ReportCatalogEntryResponse> GetCatalog();

    Task<ReportPreviewEnvelope?> RunPreviewAsync(
        string reportId,
        ReportQueryRequest request,
        bool isEntityRestricted,
        int? companyId);

    Task<(byte[] Bytes, string ContentType, string FileName)?> RunExportAsync(
        string reportId,
        ReportQueryRequest request,
        bool isEntityRestricted,
        int? companyId,
        ClaimsPrincipal user);
}
