using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Inventory;

public class CreateInventoryItemRequest
{
    // Optional - when omitted, the server auto-generates a unique
    // InventoryTag (see InventoryItem.InventoryTag's own comment).
    // Supply it only when importing an item that already carries an
    // in-house tag.
    [MaxLength(50)]
    public string? InventoryTag { get; set; }

    [Required]
    [MaxLength(200)]
    public string ItemName { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? SerialNumber { get; set; }

    [Required]
    public int CategoryId { get; set; }

    [Required]
    public int CompanyId { get; set; }

    public int? LocationId { get; set; }

    public int? DepartmentId { get; set; }

    // When set, this item is treated as an existing IT Asset - see
    // InventoryService.CreateAsync for the validation this triggers
    // (PurchaseRequisitionLineItemId below must be omitted in that
    // case; PR/PO/cost/vendor are read through the Asset instead).
    public int? AssetId { get; set; }

    // Optional link to an approved PR's open line - mirrors Asset's own
    // create-time PR link validation exactly (must belong to an
    // Approved PR, must have remaining unfulfilled quantity). Ignored
    // when AssetId is set (that item's PR link, if any, is the Asset's
    // own).
    public int? PurchaseRequisitionLineItemId { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? PurchaseCost { get; set; }

    public int? VendorId { get; set; }

    [MaxLength(1000)]
    public string? Remarks { get; set; }
}
