namespace PPS.LicenseManager.API.DTOs.Utilization;

/*
 * Headline KPIs for the Executive Dashboard. Every count here comes
 * directly from usable UtilizationFact rows (or, for TotalLicenses, from
 * the existing LicensePurchase table) - never fabricated. Nullable
 * percentage/derived fields carry an explicit *_Unavailable reason so the
 * dashboard can render "insufficient data" instead of a misleading 0%,
 * per the module's rules against inventing numbers.
 */
public class UtilizationOverviewResponse
{
    public bool HasData { get; set; }

    public DateOnly? ReportingPeriodStart { get; set; }
    public DateOnly? ReportingPeriodEnd { get; set; }

    public int UploadBatchCount { get; set; }

    public int? TotalLicenses { get; set; }
    public string? TotalLicensesUnavailableReason { get; set; }

    public int AssignedSeats { get; set; }

    public int UsedSeats { get; set; }

    public int UnusedSeats { get; set; }

    public decimal? UtilizationPct { get; set; }
    public string? UtilizationPctUnavailableReason { get; set; }

    public decimal? WastagePct { get; set; }
    public string? WastagePctUnavailableReason { get; set; }

    public int NeverUsedUserCount { get; set; }

    public int RowsExcludedFromCalculation { get; set; }
    public decimal DataCompletenessPct { get; set; }
}
