namespace PPS.LicenseManager.API.DTOs.ReportCenter;

public class ReportFilterFieldResponse
{
    public string Key { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string[]? Options { get; set; }

    public string? DefaultValue { get; set; }
}
