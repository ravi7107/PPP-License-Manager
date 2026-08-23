namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * One row of the audit/reconciliation report - every Asset or
 * LicensePurchase that has been linked back to the Purchase Requisition it
 * was bought against, across the whole system (not scoped to a single PR,
 * unlike PurchaseRequisitionFulfillmentItemResponse). See
 * PurchaseRequisitionService.GetFulfillmentReportAsync.
 */
public class PurchaseRequisitionFulfillmentReportRow
{
    // "Asset" or "License".
    public string Type { get; set; } = string.Empty;

    public string ItemDescription { get; set; } = string.Empty;

    public string PrNumber { get; set; } = string.Empty;

    public string? PoNumber { get; set; }

    public DateTime? PrApprovedAt { get; set; }

    public DateTime? PurchaseDate { get; set; }

    public string? Vendor { get; set; }

    public decimal? Cost { get; set; }

    public string RequestedByUserName { get; set; } = string.Empty;
}
