namespace PPS.LicenseManager.API.DTOs.AssetAudit;

public class AssetAuditResponse
{
    public int Id { get; set; }

    public int LocationId { get; set; }

    public string LocationName { get; set; } = string.Empty;

    public int? DepartmentId { get; set; }

    public string? DepartmentName { get; set; }

    public int StartedByUserId { get; set; }

    public string StartedByUserName { get; set; } = string.Empty;

    public DateTime StartedAt { get; set; }

    public string Status { get; set; } = string.Empty;

    public int? CompletedByUserId { get; set; }

    public string? CompletedByUserName { get; set; }

    public DateTime? CompletedAt { get; set; }

    public int ExpectedCount { get; set; }

    public int FoundCount { get; set; }

    public int MissingCount { get; set; }

    public int UnexpectedCount { get; set; }

    public string? Remarks { get; set; }
}

public class AssetAuditItemResponse
{
    public int Id { get; set; }

    public int AssetId { get; set; }

    public string AssetTag { get; set; } = string.Empty;

    public string AssetName { get; set; } = string.Empty;

    public string AssetType { get; set; } = string.Empty;

    public bool IsExpected { get; set; }

    public bool IsScanned { get; set; }

    public DateTime? ScannedAt { get; set; }

    public int? ScannedByUserId { get; set; }

    public string? ScannedByUserName { get; set; }

    // Found, Missing, Unexpected, WrongLocation - see AssetAuditItem.
    public string ResultState { get; set; } = string.Empty;

    public string? Remarks { get; set; }
}

// GET /api/AssetAudit/{id} - the session plus every item in it, for the
// mobile app's live audit-session and results screens.
public class AssetAuditDetailResponse
{
    public AssetAuditResponse Audit { get; set; } = null!;

    public List<AssetAuditItemResponse> Items { get; set; } = new();
}

// Response to a single POST {id}/scan - the affected item, whether this
// was a rescan of something already recorded this session, and the
// session's updated counters so the mobile app never needs a second
// round-trip to refresh its summary numbers after a scan.
public class AssetAuditScanResponse
{
    public AssetAuditItemResponse Item { get; set; } = null!;

    public bool WasDuplicate { get; set; }

    public AssetAuditResponse Audit { get; set; } = null!;
}
