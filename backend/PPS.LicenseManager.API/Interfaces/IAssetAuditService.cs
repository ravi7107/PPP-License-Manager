using PPS.LicenseManager.API.DTOs.AssetAudit;

namespace PPS.LicenseManager.API.Interfaces;

public interface IAssetAuditService
{
    Task<AssetAuditDetailResponse> StartAsync(
        StartAssetAuditRequest request,
        int startedByUserId);

    // Null return means "audit session not found" (controller -> 404).
    // An InvalidOperationException means the session exists but the
    // request is invalid for its current state (controller -> 400) -
    // e.g. scanning into an already-completed session.
    Task<AssetAuditScanResponse?> RecordScanAsync(
        int auditId,
        RecordAssetAuditScanRequest request,
        int scannedByUserId);

    Task<AssetAuditDetailResponse?> CompleteAsync(
        int auditId,
        CompleteAssetAuditRequest request,
        int completedByUserId);

    Task<AssetAuditDetailResponse?> GetAsync(int auditId);

    // Recent sessions, most recent first - backs the mobile dashboard's
    // "pending audit items" and a simple audit history list. Optional
    // status filter ("InProgress" for "pick up where I left off").
    Task<List<AssetAuditResponse>> GetRecentAsync(
        string? status = null,
        int take = 20);
}
