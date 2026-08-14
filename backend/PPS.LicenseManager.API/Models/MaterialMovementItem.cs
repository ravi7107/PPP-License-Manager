using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * One line of a MaterialMovement. AssetId is populated when this line
 * moves a specific serialized IT Asset (Item.MaterialType == "ITAsset" and
 * Item.IsSerialized == true) - otherwise the line is a bulk Quantity of a
 * non-serialized Item, or a serialized non-Asset item tracked only by
 * SerialNumbers free text (e.g. a serialized tool that isn't in the Asset
 * register).
 */
public class MaterialMovementItem
{
    public int Id { get; set; }

    [Required]
    public int MovementId { get; set; }
    public MaterialMovement Movement { get; set; } = null!;

    [Required]
    public int ItemId { get; set; }
    public MaterialItem Item { get; set; } = null!;

    // Optional - set when this line moves a specific row from the Asset
    // register (see class comment).
    public int? AssetId { get; set; }
    public Asset? Asset { get; set; }

    public decimal Quantity { get; set; } = 1m;

    [MaxLength(20)]
    public string? UnitOfMeasure { get; set; }

    [MaxLength(500)]
    public string? SerialNumbers { get; set; }

    [MaxLength(30)]
    public string? Condition { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
