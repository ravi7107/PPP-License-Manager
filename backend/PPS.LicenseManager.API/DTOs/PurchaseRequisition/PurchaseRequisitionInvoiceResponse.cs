namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

// One row per invoice raised against this PR/PO (see
// Models.PurchaseRequisitionInvoice's own comment on why this is a list,
// not a single set of header fields). HasInvoiceDocument follows the same
// convention as the PO fields' HasPoDocument - the frontend downloads the
// file through the authenticated GET {id}/invoices/{invoiceId}/document
// endpoint rather than being handed a direct URL, since invoice documents
// live under the same private storage area as PO documents.
public class PurchaseRequisitionInvoiceResponse
{
    public int Id { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public decimal? InvoiceAmount { get; set; }
    public bool HasInvoiceDocument { get; set; }
    public DateTime UploadedAt { get; set; }
    public int UploadedByUserId { get; set; }
    public string? UploadedByUserName { get; set; }
    public int? MaterialMovementReceiptId { get; set; }
    public string? Notes { get; set; }
}
