namespace PPS.LicenseManager.API.DTOs.Asset;

public class WarrantySummaryResponse
{
    public int TotalAssets { get; set; }
    public int UnderWarranty { get; set; }
    public int ExpiredWarranty { get; set; }
    public int ExpiringIn30Days { get; set; }
    public int ExpiringIn60Days { get; set; }
    public int ExpiringIn90Days { get; set; }
    public int NoWarranty { get; set; }
}
