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
    [Required]
    public int DepartmentId { get; set; }

    // Optional - a PR doesn't have to have a single named vendor decided
    // yet (e.g. still gathering quotes), but when set it must reference an
    // active Vendor and is shown on the generated PDF's vendor section.
    public int? VendorId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Justification { get; set; }

    [MaxLength(3)]
    public string? Currency { get; set; }

    // Optional flat tax amount (this module doesn't model a tax-rate
    // engine - if the business needs GST computed automatically, that's a
    // follow-up enhancement). Must be >= 0; null/omitted defaults to 0.
    [Range(0, double.MaxValue, ErrorMessage = "Tax amount cannot be negative.")]
    public decimal? TaxAmount { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "A purchase requisition must have at least one line item.")]
    public List<PurchaseRequisitionLineItemRequest> LineItems { get; set; } = new();
}
