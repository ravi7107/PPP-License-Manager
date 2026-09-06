using System.Security.Claims;
using PPS.LicenseManager.API.DTOs.ReportCenter;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IReportCenterService
{
    List<ReportCatalogEntryResponse> GetCatalog();

    // True when the given role may run this report at all - unknown
    // reportId returns true so RunPreviewAsync/RunExportAsync's own
    // "unknown report" 404 stays the operative error, not a misleading
    // 403. Called by ReportCenterController before RunPreviewAsync/
    // RunExportAsync so a role-restricted report (see
    // ReportDefinition.RequiredRoles) never even starts its query.
    bool IsReportAllowedForRole(string reportId, string role);

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
