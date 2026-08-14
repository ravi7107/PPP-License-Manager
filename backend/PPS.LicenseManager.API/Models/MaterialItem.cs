using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Material Movement Management module - the generic Item/Stock/Consumable
 * catalog this codebase never had (Purchase Requisition's line items are
 * free-text only). Every MaterialMovementItem references one of these.
 *
 * MaterialType: Stock, Consumable, ITAsset, Equipment, Tool, SparePart,
 * Other. When MaterialType == "ITAsset" and IsSerialized == true, a moved
 * unit is expected to also link to a specific Asset row (see
 * MaterialMovementItem.AssetId) rather than just a quantity.
 */
public class MaterialItem
{
    public int Id { get; set; }

    [Required]
    [MaxLength(30)]
    public string ItemCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string ItemName { get; set; } = string.Empty;

    [Required]
    public int CategoryId { get; set; }

    public MaterialItemCategory Category { get; set; } = null!;

    [Required]
    [MaxLength(30)]
    public string MaterialType { get; set; } = "Stock";

    [MaxLength(20)]
    public string? UnitOfMeasure { get; set; }

    // True for individually-tracked units (serial number / asset tag
    // required per movement line) rather than bulk quantity.
    public bool IsSerialized { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
