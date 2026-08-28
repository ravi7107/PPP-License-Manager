namespace PPS.LicenseManager.API.DTOs.Asset;

public class AssetResponse
{
    public int Id { get; set; }

    public string AssetTag { get; set; } = string.Empty;

    public string AssetName { get; set; } = string.Empty;

    public string AssetType { get; set; } = string.Empty;

    public string? Manufacturer { get; set; }

    public string? Model { get; set; }

    public string? HostName { get; set; }

    public string? Processor { get; set; }

    public int? RamGb { get; set; }

    public int? StorageGb { get; set; }

    public string? GraphicsCard { get; set; }

    public string? OperatingSystem { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public bool IsReadyForAssignment { get; set; }

    public DateTime? WarrantyExpiry { get; set; }

    public bool IsActive { get; set; }

   public string? SerialNumber { get; set; }

public int DepartmentId { get; set; }

public DateTime? PurchaseDate { get; set; }

public string? Remarks { get; set; }

// Rental tracking - "Owned" (default) or "Rented".
public string? OwnershipType { get; set; }

public int? VendorId { get; set; }

public string? VendorName { get; set; }

public DateTime? RentalStartDate { get; set; }

public DateTime? RentalEndDate { get; set; }

public bool DualMonitor { get; set; }

// Entity - needed for the "complete" Excel export/import template, which
// resolves Department per-row via Entity + Department name text rather
// than a single dialog-level picker (a real org can have multiple
// Departments per Entity, so Department name alone isn't enough).
public int? CompanyId { get; set; }

public string? CompanyName { get; set; }

// Phase 8 - set only when this asset was created linked to a Purchase
// Requisition line (see Asset.PurchaseRequisitionId's model comment -
// linking is always optional, so all of these are null for most assets).
// PoNumber/PoDate/PoAmount are drawn from that PR's own PO fields (Phase
// 6). InvoiceCount/TotalInvoiceAmount summarize that PR's invoices (Phase
// 7) - populated by GetAllAsync/GetByIdAsync (the list/detail endpoints
// that actually feed the Hardware page's asset view), left at their
// default (0/null) by GetPagedAsync's in-memory MapToResponse, which has
// no database access to compute them from.
public int? PurchaseRequisitionId { get; set; }

public string? PrNumber { get; set; }

public string? PoNumber { get; set; }

public DateTime? PoDate { get; set; }

public decimal? PoAmount { get; set; }

public int InvoiceCount { get; set; }

public decimal? TotalInvoiceAmount { get; set; }
}
