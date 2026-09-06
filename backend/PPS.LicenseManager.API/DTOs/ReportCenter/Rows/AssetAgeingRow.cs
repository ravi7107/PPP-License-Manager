namespace PPS.LicenseManager.API.DTOs.ReportCenter.Rows;

public class AssetAgeingRow
{
    public string AssetTag { get; set; } = string.Empty;

    public string AssetName { get; set; } = string.Empty;

    public string? CompanyName { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public DateTime? PurchaseDate { get; set; }

    // Computed after materialization (see
    // ReportCenterService.EnrichAssetAgeingRows) - same reasoning as
    // WarrantyExpiryRow.DaysUntilExpiry.
    public double? AgeInYears { get; set; }

    public string AgeBucket { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;
}
