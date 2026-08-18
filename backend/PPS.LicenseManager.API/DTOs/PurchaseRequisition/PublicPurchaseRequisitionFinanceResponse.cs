namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * Deliberately minimal, mostly-read-only view of a PR for the
 * unauthenticated Finance email-link landing page (GET
 * /api/purchase-requisitions/public-finance/{token}) - only what Finance
 * needs to verify the request and its quotation before issuing a PO. No
 * internal numeric PR id, requester email, or approval-step detail is
 * exposed here.
 *
 * Fetching this is always side-effect free, same GET-is-read-only
 * principle as PublicPurchaseRequisitionApprovalResponse - only the POST
 * upload endpoint records the PO.
 */
public class PublicPurchaseRequisitionFinanceResponse
{
    public string? PrNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string RequestedByUserName { get; set; } = string.Empty;

    public string? VendorName { get; set; }
    public string? VendorGstin { get; set; }

    public string Currency { get; set; } = string.Empty;
    public decimal SubtotalAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }

    // Draft, Submitted, InApproval, Approved, Rejected - this link is only
    // ever issued once a PR reaches Approved, but the landing page checks
    // this rather than assuming, same defensive pattern as the approval
    // landing page.
    public string PurchaseRequisitionStatus { get; set; } = string.Empty;

    public bool IsExpired { get; set; }

    public List<PurchaseRequisitionLineItemResponse> LineItems { get; set; } = new();

    // Vendor-quotation attachments only (not "Supporting") - what Finance
    // needs to verify pricing against. DownloadUrl is a plain public URL
    // (attachments already live under wwwroot/uploads, same as everywhere
    // else in this module - see PurchaseRequisitionAttachment.StoredPath),
    // not the authenticated PDF-style endpoint.
    public List<PublicPurchaseRequisitionQuotationResponse> QuotationAttachments { get; set; } = new();

    // Reflects whatever was last uploaded through this same link - null
    // until Finance's first upload. The link stays usable after that (see
    // PurchaseRequisitionFinanceNotification.TokenHash's comment), so a
    // second visit shows what's already on file rather than looking blank.
    public string? PoNumber { get; set; }
    public bool HasPoDocument { get; set; }
    public DateTime? PoUploadedAt { get; set; }
}

public class PublicPurchaseRequisitionQuotationResponse
{
    public string FileName { get; set; } = string.Empty;
    public string DownloadUrl { get; set; } = string.Empty;
}
