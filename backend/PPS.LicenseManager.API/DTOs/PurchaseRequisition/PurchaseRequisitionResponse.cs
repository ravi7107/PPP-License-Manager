namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class PurchaseRequisitionResponse
{
    public int Id { get; set; }

    // Null while Draft - assigned on Submit.
    public string? PrNumber { get; set; }

    public int CompanyId { get; set; }
    public string? CompanyName { get; set; }

    // Optional - no longer collected on the form (Entity/Company above
    // replaces it), null on every PR created after this change. Kept for
    // PRs created before it.
    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    // Optional - null when no vendor has been selected for this PR yet.
    public int? VendorId { get; set; }
    public string? VendorName { get; set; }

    public int RequestedByUserId { get; set; }
    public string RequestedByUserName { get; set; } = string.Empty;

    // Optional - who this PR is being raised on behalf of, when that's a
    // different person from the logged-in requester. Purely informational
    // (see PurchaseRequisition.InitiatedByContactId's model comment).
    public int? InitiatedByContactId { get; set; }
    public string? InitiatedByContactName { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Justification { get; set; }

    // Draft, Submitted, InApproval, Approved, Rejected
    public string Status { get; set; } = string.Empty;

    public int RequiredApprovalStageCount { get; set; }
    public int? CurrentApprovalStepOrder { get; set; }

    public string Currency { get; set; } = string.Empty;
    public decimal SubtotalAmount { get; set; }
    public decimal CgstPercent { get; set; }
    public decimal SgstPercent { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }

    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? RejectedAt { get; set; }

    public string? PdfPath { get; set; }
    public DateTime? PdfGeneratedAt { get; set; }

    // Set once Finance uploads a PO copy via the emailed Finance link
    // (see PurchaseRequisitionService.UploadPoByTokenAsync) - null until
    // then. PoUploadedByUserName is always null today since Finance acts
    // through that link, not an in-app account (see
    // PurchaseRequisition.PoUploadedByUserId's model comment); kept as a
    // nullable field rather than removed so an authenticated upload path
    // added later doesn't need another response-shape change.
    public string? PoNumber { get; set; }
    public string? PoDocumentPath { get; set; }
    public DateTime? PoUploadedAt { get; set; }
    public string? PoUploadedByUserName { get; set; }

    // Added alongside the original 4 PO fields above (Phase 6) - PoDate/
    // PoAmount/PoUploadedByEmail are all null for a PR whose PO was
    // uploaded before this shipped, same as any other nullable field on a
    // pre-existing row. PoUploadHistory lists every past upload/re-upload,
    // oldest first - empty for a PR with no PO uploaded yet.
    public DateTime? PoDate { get; set; }
    public decimal? PoAmount { get; set; }
    public string? PoUploadedByEmail { get; set; }
    public List<PurchaseRequisitionPoUploadResponse> PoUploadHistory { get; set; } = new();

    // Phase 7 - every invoice raised against this PR/PO so far, oldest
    // first. Empty for a PR with no invoice uploaded yet (the common case
    // until material is actually received/billed). See
    // Models.PurchaseRequisitionInvoice's own comment on why this is a
    // list rather than more header fields like the PO ones above.
    public List<PurchaseRequisitionInvoiceResponse> Invoices { get; set; } = new();

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Whether the caller is the owner - drives which actions the frontend
    // shows (Edit/Submit/Delete are owner-only, and only while Draft).
    public bool IsOwner { get; set; }

    // 0 for every PR created the normal way ("Rev 00"). Only > 0 on a
    // Draft/PR created by CreateRevisionAsync from a previously Approved
    // one - see PurchaseRequisition.RevisionNumber's model comment.
    public int RevisionNumber { get; set; }
    public int? PreviousRevisionId { get; set; }
    public string? PreviousPrNumber { get; set; }

    public List<PurchaseRequisitionLineItemResponse> LineItems { get; set; } = new();
    public List<PurchaseRequisitionAttachmentResponse> Attachments { get; set; } = new();
    public List<PurchaseRequisitionApprovalStepResponse> ApprovalSteps { get; set; } = new();

    // Read-only audit trail: which Assets/LicensePurchases have actually
    // been created against this PR's line items so far (see
    // PurchaseRequisitionService.GetByIdAsync) - empty for every PR with no
    // linked Asset/LicensePurchase yet, which is the normal case for most
    // PRs since linking is optional. Only populated on the single-PR detail
    // fetch, not on list endpoints, to avoid an N+1 query cost there.
    public List<PurchaseRequisitionFulfillmentItemResponse> FulfilledByItems { get; set; } = new();
}
