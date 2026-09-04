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

    // Populated only when this asset was created linked to a Purchase
    // Requisition line (see Asset.PurchaseRequisitionId's model comment -
    // linking is always optional, so these are null for most assets).
    // PoDate/PoAmount are drawn from that PR's own PO fields (Phase 6).
    public string? PrNumber { get; set; }

    public string? PoNumber { get; set; }

    public DateTime? PoDate { get; set; }

    public decimal? PoAmount { get; set; }

    public bool IsActive { get; set; }
}
