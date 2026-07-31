namespace PPS.LicenseManager.API.DTOs.Asset;

public class DepartmentAssetSummary
{
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int AssetCount { get; set; }
}
