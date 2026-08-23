using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Asset;

public class UpdateAssetRequest
{
    [Required]
    public string AssetTag { get; set; } = string.Empty;

    [Required]
    public string AssetName { get; set; } = string.Empty;

    [Required]
    public string AssetType { get; set; } = string.Empty;

    public string? Manufacturer { get; set; }

    public string? Model { get; set; }

    public string? SerialNumber { get; set; }

    public string? HostName { get; set; }

    public string? Processor { get; set; }

    public int? RamGb { get; set; }

    public int? StorageGb { get; set; }

    public string? GraphicsCard { get; set; }

    public string? OperatingSystem { get; set; }

    public int DepartmentId { get; set; }

    public DateTime? PurchaseDate { get; set; }

    public DateTime? WarrantyExpiry { get; set; }

    // Optional link to the Purchase Requisition line item this asset was
    // bought against - see CreateAssetRequest's comment. Only re-validated
    // by AssetService.UpdateAsync when this value actually changes from
    // what's already on the asset.
    public int? PurchaseRequisitionLineItemId { get; set; }

    public decimal? PurchaseCost { get; set; }

    public string? Remarks { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsReadyForAssignment { get; set; } = true;

    public string Status { get; set; } = "Available";

    // Rental tracking - "Owned" (default) or "Rented".
    public string? OwnershipType { get; set; }

    public int? VendorId { get; set; }

    public DateTime? RentalStartDate { get; set; }

    public DateTime? RentalEndDate { get; set; }

    public bool DualMonitor { get; set; } = false;
}
