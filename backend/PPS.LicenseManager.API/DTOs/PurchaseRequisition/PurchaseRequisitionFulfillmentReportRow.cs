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

    // Phase 9 - PO Date/Amount (Phase 6) and invoice totals (Phase 7),
    // duplicated per fulfilling row exactly like PoNumber already is above
    // (a PO/invoice is recorded at the PR header level, not per line item -
    // every Asset/License that PR fulfilled shows the same PO/invoice
    // figures, matching this report's existing one-row-per-fulfilled-item
    // shape rather than one-row-per-PR).
    public DateTime? PoDate { get; set; }

    public decimal? PoAmount { get; set; }

    public int InvoiceCount { get; set; }

    public decimal? TotalInvoiceAmount { get; set; }

    // Computed, not set by the query - always derived from the fields
    // above so it can never drift out of sync with them. This is the
    // actual audit-proof deliverable the business owner asked for:
    //   "No PO"            - PR has fulfilled this item but no PO number
    //                         has been recorded yet.
    //   "No Invoice"        - PO exists but no invoice has been uploaded
    //                         against this PR yet.
    //   "Amount Mismatch"   - both a PO amount and at least one invoice
    //                         exist, but the invoiced total doesn't equal
    //                         the PO amount (partial/staged delivery still
    //                         in progress, or a real discrepancy).
    //   "OK"                - PO recorded, at least one invoice recorded,
    //                         and (when both amounts are known) they match.
    // Deliberately compares PoAmount against the summed invoice total only
    // - not against this row's own Cost - since PoAmount is a PR-header
    // total that can legitimately span multiple fulfilled line items (e.g.
    // one PO for 5 laptops), so comparing it to a single item's Cost would
    // be meaningless whenever a PR fulfilled more than one item.
    public string ReconciliationFlag
    {
        get
        {
            if (string.IsNullOrEmpty(PoNumber))
                return "No PO";

            if (InvoiceCount == 0)
                return "No Invoice";

            if (PoAmount.HasValue && TotalInvoiceAmount.HasValue
                && PoAmount.Value != TotalInvoiceAmount.Value)
                return "Amount Mismatch";

            return "OK";
        }
    }
}
