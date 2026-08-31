namespace PPS.LicenseManager.API.DTOs.ReportCenter;

public class ReportCatalogEntryResponse
{
    public string Id { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public List<ReportFilterFieldResponse> Filters { get; set; } = new();
}
