namespace PPS.LicenseManager.API.DTOs.Utilization;

public class UtilizationUploadBatchResponse
{
    public int Id { get; set; }

    public int? SoftwareId { get; set; }
    public string? SoftwareName { get; set; }

    public string VendorSourceName { get; set; } = string.Empty;

    public string OriginalFileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }

    public DateOnly ReportingPeriodStart { get; set; }
    public DateOnly ReportingPeriodEnd { get; set; }

    public string Status { get; set; } = string.Empty;

    public int TotalRowCount { get; set; }
    public int UsableRowCount { get; set; }
    public int WarningRowCount { get; set; }

    public int? CompanyId { get; set; }
    public string? CompanyName { get; set; }

    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    public string UploadedByUserName { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }

    public bool IsActive { get; set; }

    // Set (non-null) only when this upload was rejected as an exact
    // duplicate of an already-active batch - see
    // UtilizationUploadService's FileHash check. Null on every normal
    // response.
    public int? DuplicateOfBatchId { get; set; }
}
