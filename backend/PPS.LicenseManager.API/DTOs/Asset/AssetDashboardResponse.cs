namespace PPS.LicenseManager.API.DTOs.Asset;

public class AssetDashboardResponse
{
    public int TotalAssets { get; set; }
    public int AvailableAssets { get; set; }
    public int AssignedAssets { get; set; }
    public int MaintenanceAssets { get; set; }
    public int RetiredAssets { get; set; }

    public int WarrantyExpired { get; set; }
    public int Warranty30Days { get; set; }
    public int Warranty60Days { get; set; }
    public int Warranty90Days { get; set; }
}
