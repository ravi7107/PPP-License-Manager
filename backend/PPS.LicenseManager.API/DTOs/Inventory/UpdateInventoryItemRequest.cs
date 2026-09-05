using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Inventory;

/*
 * Deliberately excludes InventoryTag (immutable once created - see
 * InventoryItem.InventoryTag's own comment) and CompanyId (an item's
 * Entity is fixed at creation; moving it between sub-companies is a
 * bigger decision than an edit form should allow silently - out of
 * scope for this module, same call already made implicitly for Asset).
 */
public class UpdateInventoryItemRequest
{
    [Required]
    [MaxLength(200)]
    public string ItemName { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? SerialNumber { get; set; }

    [Required]
    public int CategoryId { get; set; }

    public int? LocationId { get; set; }

    public int? DepartmentId { get; set; }

    public int? AssetId { get; set; }

    public int? PurchaseRequisitionLineItemId { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? PurchaseCost { get; set; }

    public int? VendorId { get; set; }

    [MaxLength(1000)]
    public string? Remarks { get; set; }

    public bool IsActive { get; set; } = true;
}
