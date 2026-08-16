using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Asset;

public class CreateAssetRequest
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

    public string? Remarks { get; set; }

    // Rental tracking - "Owned" (default) or "Rented".
    public string? OwnershipType { get; set; }

    public int? VendorId { get; set; }

    public DateTime? RentalStartDate { get; set; }

    public DateTime? RentalEndDate { get; set; }
}
