namespace PPS.LicenseManager.API.DTOs.ReportCenter.Rows;

public class LicenseRegisterRow
{
    public string AliasCode { get; set; } = string.Empty;

    public string SoftwareName { get; set; } = string.Empty;

    public string LicensedEmail { get; set; } = string.Empty;

    public string? Vendor { get; set; }

    public string? CompanyName { get; set; }

    public string? DepartmentName { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime PurchaseDate { get; set; }

    public DateTime ExpiryDate { get; set; }

    public decimal PurchaseCost { get; set; }
}
