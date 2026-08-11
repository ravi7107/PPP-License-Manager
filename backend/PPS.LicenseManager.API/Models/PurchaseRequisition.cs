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

    [Required]
    public int DepartmentId { get; set; }

    public Department Department { get; set; } = null!;

    [Required]
    public int RequestedByUserId { get; set; }

    public User RequestedByUser { get; set; } = null!;

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

    // Which stage is currently awaiting a decision. Null before submit and
    // after the PR reaches a terminal state (Approved/Rejected).
    public int? CurrentApprovalStepOrder { get; set; }

    [Required]
    [MaxLength(3)]
    public string Currency { get; set; } = "INR";

    // Recomputed server-side from line items on every save - never trusted
    // from the client.
    public decimal SubtotalAmount { get; set; }

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

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ICollection<PurchaseRequisitionLineItem> LineItems { get; set; } =
        new List<PurchaseRequisitionLineItem>();

    public ICollection<PurchaseRequisitionAttachment> Attachments { get; set; } =
        new List<PurchaseRequisitionAttachment>();

    public ICollection<PurchaseRequisitionApprovalStep> ApprovalSteps { get; set; } =
        new List<PurchaseRequisitionApprovalStep>();
}
