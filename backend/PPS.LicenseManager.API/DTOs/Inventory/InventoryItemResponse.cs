namespace PPS.LicenseManager.API.DTOs.Inventory;

public class InventoryItemResponse
{
    public int Id { get; set; }

    public string InventoryTag { get; set; } = string.Empty;

    // What to actually put on a QR/printed label and show as the
    // primary identifier: when this item IS a tracked IT Asset
    // (AssetId set), the Asset already has its own sticker/QR from
    // the Hardware module - so this reuses the Asset's own AssetTag
    // instead of minting a second, different QR for the same
    // physical item. Otherwise falls back to this item's own
    // InventoryTag. Computed in InventoryService's projection;
    // InventoryTag itself is unchanged and still the row's real
    // unique DB identifier either way.
    public string DisplayTag { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? SerialNumber { get; set; }

    public int CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public int CompanyId { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    public int? LocationId { get; set; }

    public string? LocationName { get; set; }

    public int? DepartmentId { get; set; }

    public string? DepartmentName { get; set; }

    // Set when this item IS a tracked IT Asset - see
    // InventoryItem.AssetId's own comment. When set, PrNumber/PoNumber/
    // PoDate/PoAmount/VendorId/VendorName/PurchaseCost below are read
    // through THAT Asset's own linked PR, not through this item's own
    // (in that case always-null) PurchaseRequisitionId/PurchaseCost/
    // VendorId - see InventoryService's projection for exactly how.
    public int? AssetId { get; set; }

    public string? AssetTag { get; set; }

    public int? PurchaseRequisitionId { get; set; }

    public int? PurchaseRequisitionLineItemId { get; set; }

    // Resolved regardless of whether the source is this item's own PR
    // link or (when AssetId is set) the linked Asset's PR link.
    public string? PrNumber { get; set; }

    public string? PoNumber { get; set; }

    public DateTime? PoDate { get; set; }

    public decimal? PoAmount { get; set; }

    public decimal? PurchaseCost { get; set; }

    public int? VendorId { get; set; }

    public string? VendorName { get; set; }

    public string? Remarks { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
