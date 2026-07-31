namespace PPS.LicenseManager.API.DTOs.Asset;

public class AssetDashboardOverviewResponse
{
    public AssetDashboardResponse Kpis { get; set; } = new();

    public IEnumerable<DepartmentAssetSummary> DepartmentSummary { get; set; }
        = Enumerable.Empty<DepartmentAssetSummary>();

    public IEnumerable<ManufacturerSummaryResponse> ManufacturerSummary { get; set; }
        = Enumerable.Empty<ManufacturerSummaryResponse>();

    public IEnumerable<AssetTypeSummaryResponse> AssetTypeSummary { get; set; }
        = Enumerable.Empty<AssetTypeSummaryResponse>();

    public WarrantySummaryResponse Warranty { get; set; } = new();
}
