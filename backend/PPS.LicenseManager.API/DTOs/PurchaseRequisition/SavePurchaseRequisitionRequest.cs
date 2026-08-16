using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * Used for both create-draft and update-draft - a Draft's header and line
 * items are always saved together as a whole document (the frontend keeps
 * the line items array in memory and PUTs the full list on every save),
 * which is simpler and less error-prone than partial line-item endpoints
 * for a v1. Subtotal/Tax/Total are never accepted from the client - see
 * PurchaseRequisitionService.RecomputeTotals.
 */
public class SavePurchaseRequisitionRequest
{
    // The Entity (Company) this PR is raised under - replaces Department
    // as the required organizational selector on the New Purchase
    // Requisition form.
    [Required]
    public int CompanyId { get; set; }

    // Optional - a PR doesn't have to have a single named vendor decided
    // yet (e.g. still gathering quotes), but when set it must reference an
    // active Vendor and is shown on the generated PDF's vendor section.
    public int? VendorId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Justification { get; set; }

    // Optional - who this PR is being raised on behalf of, when that's a
    // different person from the logged-in requester (see
    // PurchaseRequisition.InitiatedByContactId's comment). Purely
    // informational.
    public int? InitiatedByContactId { get; set; }

    [MaxLength(3)]
    public string? Currency { get; set; }

    // Tax is modeled as CGST + SGST (India's split GST scheme) rather than
    // a single flat amount. Both are optional in the request - null/
    // omitted falls back to the standard 9% each (18% combined) in
    // PurchaseRequisitionService.ValidateAndComputeAsync - but changeable
    // per PR.
    [Range(0, 100, ErrorMessage = "CGST % must be between 0 and 100.")]
    public decimal? CgstPercent { get; set; }

    [Range(0, 100, ErrorMessage = "SGST % must be between 0 and 100.")]
    public decimal? SgstPercent { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "A purchase requisition must have at least one line item.")]
    public List<PurchaseRequisitionLineItemRequest> LineItems { get; set; } = new();
}
