namespace PPS.LicenseManager.API.DTOs.ReportCenter;

public class ReportPreviewEnvelope
{
    public string ReportId { get; set; } = string.Empty;

    public string ReportTitle { get; set; } = string.Empty;

    public object Result { get; set; } = null!;

    public List<AppliedFilterEntry> AppliedFilters { get; set; } = new();

    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
}
