namespace PPS.LicenseManager.API.DTOs.ReportCenter.Rows;

public class WarrantyExpiryRow
{
    public string AssetTag { get; set; } = string.Empty;

    public string AssetName { get; set; } = string.Empty;

    public string? CompanyName { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public string? CurrentLocationName { get; set; }

    public DateTime? WarrantyExpiry { get; set; }

    // Computed after the row is materialized (see
    // ReportCenterService.EnrichWarrantyExpiryRows) rather than in the SQL
    // projection - date-difference arithmetic inside an EF Core projection
    // expression is a common source of provider-translation failures, and
    // there is no compiler available in this workflow to catch one.
    public int? DaysUntilExpiry { get; set; }

    public string WarrantyStatus { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;
}
