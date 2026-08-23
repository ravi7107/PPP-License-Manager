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

    // Material Movement Management module - current physical location, kept
    // in sync by MaterialMovementService whenever a movement carrying this
    // asset completes. Independent of AssetAssignment's seat-based location
    // (which only resolves when WorkMode == "Office"); this column is the
    // source of truth once the asset has ever been through a movement.
    // Nullable/additive - existing assets and pages are unaffected until a
    // movement sets it.
    public int? CurrentLocationId { get; set; }

    public OfficeLocation? CurrentLocation { get; set; }

    // Rental tracking - "Owned" (default) or "Rented". Rented assets are
    // tracked the same way as owned ones (same Assign/Transfer/Audit
    // behavior); this just tags them and records who they're rented from
    // and for how long, for management visibility. No cost/agreement
    // fields and no expiry alerting by design - just Vendor + dates.
    public string OwnershipType { get; set; } = "Owned";

    public int? VendorId { get; set; }

    public Vendor? Vendor { get; set; }

    public DateTime? RentalStartDate { get; set; }

    public DateTime? RentalEndDate { get; set; }

    // Whether this system is set up with two monitors. Purely informational
    // (inventory tracking) - doesn't affect Assign/Transfer/Audit behavior.
    public bool DualMonitor { get; set; } = false;

    // Available, Assigned, Maintenance, Reserved, Retired
    public string Status { get; set; } = "Available";

    // Ready to allocate to a user
    public bool IsReadyForAssignment { get; set; } = true;

    public DateTime? PurchaseDate { get; set; }

    public DateTime? WarrantyExpiry { get; set; }

    // Optional traceability back to the Purchase Requisition this asset was
    // bought against - never required (plenty of assets are ad-hoc,
    // outside the PR workflow entirely). Both null together, or both set
    // together - PurchaseRequisitionId is always resolved server-side from
    // the line item, never taken directly from a client (see
    // AssetService's validation), so the two can never point at mismatched
    // PRs. Restrict delete (see ApplicationDbContext) - an approved PR
    // with assets fulfilled against it should never be deletable while
    // those assets still reference it.
    public int? PurchaseRequisitionId { get; set; }

    public PurchaseRequisition? PurchaseRequisition { get; set; }

    public int? PurchaseRequisitionLineItemId { get; set; }

    public PurchaseRequisitionLineItem? PurchaseRequisitionLineItem { get; set; }

    // What this specific asset cost, when linked to a PR line (the line
    // item's UnitPrice covers the whole quantity, not this one unit) -
    // Asset has no cost field otherwise, by design. Left null for ad-hoc
    // assets with no PR link, same as the two fields above.
    public decimal? PurchaseCost { get; set; }

    public string? Remarks { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
    public ICollection<AssetSoftware> AssetSoftwares { get; set; } = new List<AssetSoftware>();
}
