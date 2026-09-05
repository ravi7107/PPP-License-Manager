namespace PPS.LicenseManager.API.Models;

/*
 * A generic, multi-department physical inventory register - separate
 * from Asset (which remains the system of record for IT hardware's own
 * assignment/audit/transfer lifecycle, unchanged by this module) and
 * from MaterialItem (the Material Movement module's item/type catalog,
 * which this does not touch either). This table has no inbound foreign
 * key from any existing table, and every field on it is new - nothing
 * existing can be broken by adding it.
 *
 * Two optional links carry this module's real requirements without
 * duplicating data entry:
 *
 *   - AssetId: when this item IS an IT asset already tracked in the
 *     Asset Register, this points at that Asset instead of re-entering
 *     its cost/vendor/PR/PO data - those are read straight through the
 *     Asset (which already reads them through its own PR link) by
 *     InventoryService when building InventoryItemResponse. A Facility/
 *     HR/other item simply leaves this null and carries its own
 *     PurchaseRequisitionId/PurchaseCost/VendorId directly, below.
 *
 *   - PurchaseRequisitionId/PurchaseRequisitionLineItemId: the same
 *     optional, server-validated link Asset already has (see
 *     Asset.PurchaseRequisitionId's own comment) - lets a non-IT item
 *     bought against a new PR/PO gradually populate PR Number/PO
 *     Number/PO Date/PO Amount the same way Assets already do, with
 *     nothing re-typed. Always resolved server-side from the line
 *     item, both null or both set together, Restrict delete (an
 *     approved PR with inventory fulfilled against it should never be
 *     deletable while items still reference it).
 *
 * CategoryId (see InventoryCategory) is what actually answers "IT
 * inventory vs Facility inventory vs HR inventory" here. CompanyId is
 * the sub-company ("Entity") this item belongs to; LocationId is its
 * physical location - both mirror how Asset/OfficeLocation already
 * scope things elsewhere in this app. DepartmentId is kept, nullable,
 * purely as an optional "currently assigned to this role/designation"
 * tag - mirroring Asset's own DepartmentId field - but, unlike Asset
 * (where it's required), it's optional here since a generic Facility/
 * HR item is not always assigned to a specific role the way an IT
 * asset assignment is. It is never used for IT/Facility/HR grouping -
 * that's CategoryId's job.
 */
public class InventoryItem
{
    public int Id { get; set; }

    // Business identifier / QR code content - same role AssetTag plays
    // for Asset. Auto-generated (format INV-{year}-{6-digit sequence},
    // mirroring the existing Gate Pass numbering convention) unless the
    // caller supplies one explicitly (e.g. importing already-labeled
    // items that carry an in-house code) - see
    // InventoryService.GenerateUniqueInventoryTagAsync. Unique, required,
    // immutable once created (not part of UpdateInventoryItemRequest) so
    // a printed QR sticker always resolves to the same item for its
    // whole life.
    public string InventoryTag { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? SerialNumber { get; set; }

    public int CategoryId { get; set; }

    public InventoryCategory? Category { get; set; }

    // Entity (sub-company) this item belongs to.
    public int CompanyId { get; set; }

    public Company? Company { get; set; }

    // Physical location - optional, same convention as
    // Asset.CurrentLocationId (nullable until/unless the item is ever
    // placed on a floor map or moved).
    public int? LocationId { get; set; }

    public OfficeLocation? Location { get; set; }

    // Optional "currently assigned to this role/designation" tag - see
    // this class's own doc comment above for why this is nullable here
    // and never used for IT/Facility/HR grouping.
    public int? DepartmentId { get; set; }

    public Department? Department { get; set; }

    // Optional link when this inventory item IS an already-tracked IT
    // Asset - see this class's own doc comment above.
    public int? AssetId { get; set; }

    public Asset? Asset { get; set; }

    // Optional PR/PO traceability - identical pattern to
    // Asset.PurchaseRequisitionId (see that field's own comment).
    public int? PurchaseRequisitionId { get; set; }

    public PurchaseRequisition? PurchaseRequisition { get; set; }

    public int? PurchaseRequisitionLineItemId { get; set; }

    public PurchaseRequisitionLineItem? PurchaseRequisitionLineItem { get; set; }

    // What this specific item cost, when not simply read through a
    // linked Asset's own PurchaseCost.
    public decimal? PurchaseCost { get; set; }

    public int? VendorId { get; set; }

    public Vendor? Vendor { get; set; }

    public string? Remarks { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
