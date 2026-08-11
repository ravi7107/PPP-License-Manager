namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * Lightweight row shape for the "My PRs" table - avoids shipping every
 * line item/attachment/approval-step down for a list view.
 */
public class PurchaseRequisitionListItemResponse
{
    public int Id { get; set; }
    public string? PrNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public int LineItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
}
