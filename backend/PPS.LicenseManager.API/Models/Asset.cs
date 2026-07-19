namespace PPS.LicenseManager.API.Models;

public class Asset
{
    public int Id { get; set; }

    // Business Identifier
    public string AssetTag { get; set; } = string.Empty;

    public string AssetName { get; set; } = string.Empty;

    // Laptop, Desktop, Workstation, Server, etc.
    public string AssetType { get; set; } = string.Empty;

    public string Manufacturer { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string SerialNumber { get; set; } = string.Empty;

    public string HostName { get; set; } = string.Empty;

    // Hardware Specification
    public string? Processor { get; set; }

    public int? RamGb { get; set; }

    public int? StorageGb { get; set; }

    public string? GraphicsCard { get; set; }	

    public string? OperatingSystem { get; set; }

    // Department
    public int DepartmentId { get; set; }

    public Department? Department { get; set; }

    // Available, Assigned, Maintenance, Reserved, Retired
    public string Status { get; set; } = "Available";

    // Ready to allocate to a user
    public bool IsReadyForAssignment { get; set; } = true;

    public DateTime? PurchaseDate { get; set; }

    public DateTime? WarrantyExpiry { get; set; }

    public string? Remarks { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
    public ICollection<AssetSoftware> AssetSoftwares { get; set; } = new List<AssetSoftware>();
}
