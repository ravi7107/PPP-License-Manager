namespace PPS.LicenseManager.API.DTOs.ReportCenter.Rows;

public class AssetRegisterRow
{
    public string AssetTag { get; set; } = string.Empty;

    public string AssetName { get; set; } = string.Empty;

    public string AssetType { get; set; } = string.Empty;

    public string Manufacturer { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string SerialNumber { get; set; } = string.Empty;

    public string DepartmentName { get; set; } = string.Empty;

    public string? CompanyName { get; set; }

    public string? CurrentLocationName { get; set; }

    public string Status { get; set; } = string.Empty;

    public string OwnershipType { get; set; } = string.Empty;

    public string? VendorName { get; set; }

    public DateTime? PurchaseDate { get; set; }

    public DateTime? WarrantyExpiry { get; set; }

    public decimal? PurchaseCost { get; set; }

    public bool IsActive { get; set; }
}
