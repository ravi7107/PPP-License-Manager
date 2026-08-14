using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

/*
 * Used for both create-draft and update-draft, same convention as
 * SavePurchaseRequisitionRequest - a Draft's header and items are always
 * saved together as a whole document.
 *
 * Which From/To/VendorId fields are required (and which are cleared)
 * depends on MovementType - validated and normalized server-side in
 * MaterialMovementService.ValidateAndNormalizeAsync, not here, since it's
 * a cross-field rule the [Required] attributes on individual properties
 * can't express. See that method's comment for the exact per-type rules.
 */
public class SaveMaterialMovementRequest
{
    [Required]
    [StringLength(30)]
    public string MovementType { get; set; } = string.Empty;

    public int? FromCompanyId { get; set; }
    public int? FromLocationId { get; set; }
    public int? FromDepartmentId { get; set; }
    public int? FromCostCenterId { get; set; }

    public int? ToCompanyId { get; set; }
    public int? ToLocationId { get; set; }
    public int? ToDepartmentId { get; set; }
    public int? ToCostCenterId { get; set; }

    // Used instead of a To/From company+location pair by
    // OutwardToVendor/InwardFromVendor.
    public int? VendorId { get; set; }

    // Required for MovementType == "TemporaryMovement", ignored otherwise.
    public DateTime? ExpectedReturnDate { get; set; }

    public string? Purpose { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "A movement must have at least one item.")]
    public List<MaterialMovementItemRequest> Items { get; set; } = new();
}
