namespace PPS.LicenseManager.API.DTOs.Utilization;

public class UtilizationProcessResultResponse
{
    public int BatchId { get; set; }

    public int TotalRowCount { get; set; }

    public int UsableRowCount { get; set; }

    // Rows imported but flagged with at least one DataQualityFlags entry
    // (may overlap with UsableRowCount - a row can have a soft warning
    // like SoftwareMismatch and still be usable for calculation).
    public int WarningRowCount { get; set; }

    // Rows that could not support any utilization calculation at all
    // (missing both usage-date and usage-day evidence).
    public int UnusableRowCount { get; set; }

    public int DuplicateRowCount { get; set; }
    public int UnmatchedSoftwareCount { get; set; }
    public int UnmatchedUserCount { get; set; }

    public string Status { get; set; } = string.Empty;
}
