using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A Purchase Requisition raised by an IT user: multiple line items, an
 * optional vendor quotation, and 1-3 sequential approval stages. Once every
 * stage approves, the PR becomes Approved and immutable - no endpoint may
 * modify a PR's line items or totals once Status == "Approved" (enforced in
 * the service layer, and defensively at the database level - see the
 * AddPurchaseRequisitionModule migration's immutability trigger).
 *
 * Status values: Draft, Submitted, InApproval, Approved, Rejected.
 * Draft is the only state the owner can edit header/line items/attachments
 * in - Submit is a one-way door into the approval engine.
 */
public class PurchaseRequisition
{
    public int Id { get; set; }

    // Auto-generated on submit (e.g. "PR-ACME-2026-0007"); null while Draft.
    [MaxLength(40)]
    public string? PrNumber { get; set; }

    [Required]
    public int CompanyId { get; set; }

    public Company Company { get; set; } = null!;

    // Optional - historically required, but the New Purchase Requisition
    // form now collects Entity (Company, selected directly below) instead
    // of Department. Left in place (rather than dropped) so PRs created
    // before this change keep their department on record; never set on
    // PRs created going forward.
    public int? DepartmentId { get; set; }

    public Department? Department { get; set; }

    // Optional - not every PR necessarily has a single named vendor yet
    // (e.g. multiple line items from different suppliers, or the vendor
    // isn't decided until quotes come in), but when set it's used on the
    // generated PDF's vendor details section.
    public int? VendorId { get; set; }

    public Vendor? Vendor { get; set; }

    [Required]
    public int RequestedByUserId { get; set; }

    public User RequestedByUser { get; set; } = null!;

    // Optional - who this PR is being raised on behalf of / who identified
    // the need, when that's a different person from RequestedByUser (the
    // actual logged-in operator who filled in the form - there's no public
    // PR-creation flow, only the public approval-link flow, so someone with
    // a login always has to be the one who submits it). Purely informational
    // metadata, shown on the PR and in the future Finance email; has no
    // effect on the approval routing itself.
    public int? InitiatedByContactId { get; set; }

    public PurchaseRequisitionContact? InitiatedByContact { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Justification { get; set; }

    // Draft, Submitted, InApproval, Approved, Rejected
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Draft";

    // Chosen at submit time - how many approval stages this PR routes
    // through (1-3).
    public int RequiredApprovalStageCount { get; set; } = 1;

    // 0 for every PR created the normal way ("Rev 00" on the PDF).
    // Incremented only by CreateRevisionAsync, which clones an Approved PR
    // into a brand-new linked Draft rather than ever mutating the
    // approved row (the immutability trigger would block that anyway) -
    // see PreviousRevisionId below and PurchaseRequisitionService.
    // CreateRevisionAsync's own comment for the full mechanism.
    public int RevisionNumber { get; set; } = 0;

    // Set only on a revision row (RevisionNumber > 0), pointing back at
    // the Approved PR it was cloned from. Self-referencing FK, Restrict
    // on delete - matches this codebase's existing self-reference
    // precedent (User.ReportsToUserId/ReportsToUser).
    public int? PreviousRevisionId { get; set; }

    public PurchaseRequisition? PreviousRevision { get; set; }

    // Inverse of PreviousRevision - every later revision cloned from this
    // row, if any.
    public ICollection<PurchaseRequisition> Revisions { get; set; } =
        new List<PurchaseRequisition>();

    // Which stage is currently awaiting a decision. Null before submit and
    // after the PR reaches a terminal state (Approved/Rejected).
    public int? CurrentApprovalStepOrder { get; set; }

    [Required]
    [MaxLength(3)]
    public string Currency { get; set; } = "INR";

    // Recomputed server-side from line items on every save - never trusted
    // from the client.
    public decimal SubtotalAmount { get; set; }

    // Tax is modeled as CGST + SGST (India's split GST scheme) rather than
    // a single flat amount - each defaults to 9% (the standard combined
    // 18% GST rate) but is editable per PR. TaxAmount below is still the
    // recomputed total of the two, kept for display/reporting and so the
    // immutability trigger's existing TaxAmount guard keeps working
    // unchanged.
    public decimal CgstPercent { get; set; } = 9m;

    public decimal SgstPercent { get; set; } = 9m;

    public decimal TaxAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public DateTime? RejectedAt { get; set; }

    // Set once, on final approval. The generated PDF is a system artifact,
    // not a user upload, so it lives here rather than in
    // PurchaseRequisitionAttachment.
    [MaxLength(300)]
    public string? PdfPath { get; set; }

    public DateTime? PdfGeneratedAt { get; set; }

    // PO tracking (Phase 2 feature - schema added now to avoid a second
    // migration). Set once Finance generates the PO in their external
    // system (e.g. Tally) and uploads the PO copy back onto this record via
    // the authenticated web app. None of these 4 columns are protected by
    // the immutability trigger, so they stay writable after Status becomes
    // Approved - that's the point, PO generation always happens after
    // approval.
    [MaxLength(50)]
    public string? PoNumber { get; set; }

    [MaxLength(300)]
    public string? PoDocumentPath { get; set; }

    public DateTime? PoUploadedAt { get; set; }

    public int? PoUploadedByUserId { get; set; }

    public User? PoUploadedByUser { get; set; }

    // PO Date/Amount, added alongside the original 4 PO columns above -
    // same "unprotected by the immutability trigger, writable after
    // Approved" treatment, same "latest wins on re-upload" semantics.
    // PoUploadedByEmail is populated from
    // PurchaseRequisitionFinanceNotification.SentToEmail (already resolved
    // at upload time) - a quick "who" without touching the deliberately-
    // null PoUploadedByUserId above (see that field's own comment for why
    // it stays null). Full history of every past upload - not just the
    // latest - lives in PoUploadHistory below.
    public DateTime? PoDate { get; set; }

    public decimal? PoAmount { get; set; }

    [MaxLength(256)]
    public string? PoUploadedByEmail { get; set; }

    public ICollection<PurchaseRequisitionPoUpload> PoUploadHistory { get; set; } =
        new List<PurchaseRequisitionPoUpload>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ICollection<PurchaseRequisitionLineItem> LineItems { get; set; } =
        new List<PurchaseRequisitionLineItem>();

    public ICollection<PurchaseRequisitionAttachment> Attachments { get; set; } =
        new List<PurchaseRequisitionAttachment>();

    public ICollection<PurchaseRequisitionApprovalStep> ApprovalSteps { get; set; } =
        new List<PurchaseRequisitionApprovalStep>();
}
