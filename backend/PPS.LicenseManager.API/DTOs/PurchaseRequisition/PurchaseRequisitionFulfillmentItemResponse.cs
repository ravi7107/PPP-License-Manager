namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * One Asset or LicensePurchase record that has been created against a PR's
 * line item - the "Fulfilled by" read-only section on the PR detail view.
 * See PurchaseRequisitionService.GetByIdAsync for how this list is built.
 */
public class PurchaseRequisitionFulfillmentItemResponse
{
    // "Asset" or "License".
    public string Type { get; set; } = string.Empty;

    // The Asset.Id or LicensePurchase.Id this row represents.
    public int RecordId { get; set; }

    public int LineItemId { get; set; }

    public string Description { get; set; } = string.Empty;

    // 1 for an Asset (always exactly one unit); TotalLicenses for a
    // License purchase (one purchase can cover several seats at once).
    public decimal Quantity { get; set; }

    public decimal? Cost { get; set; }

    public DateTime? PurchaseDate { get; set; }
}
