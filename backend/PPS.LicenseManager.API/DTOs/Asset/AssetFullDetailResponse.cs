namespace PPS.LicenseManager.API.DTOs.Asset;

/*
 * Aggregated "everything about this asset" view for the office floor
 * map's double-click detail panel - system specs, who currently holds it
 * and where, and what's installed on it. Built from three already-scoped
 * pieces (Asset, the active AssetAssignment if any, AssetSoftware rows)
 * rather than one giant join, since none of those individually need to
 * change to support this.
 */
public class AssetFullDetailResponse
{
    // -----------------------------------------------------------
    // System
    // -----------------------------------------------------------
    public int AssetId { get; set; }
    public string AssetTag { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }
    public string? HostName { get; set; }
    public string? OperatingSystem { get; set; }
    public string? Processor { get; set; }
    public int? RamGb { get; set; }
    public int? StorageGb { get; set; }
    public string? GraphicsCard { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public DateTime? WarrantyExpiry { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }

    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public int? CompanyId { get; set; }
    public string? CompanyName { get; set; }

    // -----------------------------------------------------------
    // Rental tracking - "Owned" (default) or "Rented"
    // -----------------------------------------------------------
    public string? OwnershipType { get; set; }
    public int? VendorId { get; set; }
    public string? VendorName { get; set; }
    public DateTime? RentalStartDate { get; set; }
    public DateTime? RentalEndDate { get; set; }

    // -----------------------------------------------------------
    // Current holder / location (null if unassigned)
    // -----------------------------------------------------------
    public int? AssignmentId { get; set; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public string? EmployeeCode { get; set; }
    public string? UserEmail { get; set; }
    public DateTime? AssignedOn { get; set; }

    // "Office" or "Remote" - see AssetAssignment.WorkMode.
    public string? WorkMode { get; set; }

    public int? SeatId { get; set; }
    public string? SeatCode { get; set; }
    public string? SeatName { get; set; }
    public string? FloorName { get; set; }
    public string? OfficeLocationName { get; set; }

    // -----------------------------------------------------------
    // Installed applications ("license copies installed")
    // -----------------------------------------------------------
    public List<InstalledSoftwareItem> InstalledSoftware { get; set; } = new();
}

public class InstalledSoftwareItem
{
    public int SoftwareId { get; set; }
    public string SoftwareName { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string? LicenseKey { get; set; }
    public DateTime InstallDate { get; set; }
    public string Status { get; set; } = string.Empty;
}
