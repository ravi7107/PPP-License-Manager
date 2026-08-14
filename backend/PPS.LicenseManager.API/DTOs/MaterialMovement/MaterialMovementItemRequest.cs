using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

public class MaterialMovementItemRequest
{
    [Required]
    public int ItemId { get; set; }

    // Set only when this line moves a specific serialized IT Asset - the
    // referenced Item must have MaterialType == "ITAsset" and
    // IsSerialized == true (validated in
    // MaterialMovementService.BuildItemsAsync).
    public int? AssetId { get; set; }

    [Range(0.0001, double.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
    public decimal Quantity { get; set; } = 1m;

    [StringLength(20)]
    public string? UnitOfMeasure { get; set; }

    [StringLength(500)]
    public string? SerialNumbers { get; set; }

    [StringLength(30)]
    public string? Condition { get; set; }

    [StringLength(500)]
    public string? Remarks { get; set; }
}
