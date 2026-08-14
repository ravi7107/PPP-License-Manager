using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.MaterialItem;

public class CreateMaterialItemRequest
{
    [Required]
    [StringLength(30)]
    public string ItemCode { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string ItemName { get; set; } = string.Empty;

    [Required]
    public int CategoryId { get; set; }

    // Stock, Consumable, ITAsset, Equipment, Tool, SparePart, Other -
    // validated against MaterialItemService.AllowedMaterialTypes.
    [Required]
    [StringLength(30)]
    public string MaterialType { get; set; } = "Stock";

    [StringLength(20)]
    public string? UnitOfMeasure { get; set; }

    public bool IsSerialized { get; set; }

    public string? Description { get; set; }
}
