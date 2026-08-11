using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Append-only audit trail for a single Purchase Requisition. No
 * update/delete endpoint will ever be exposed for this table. Deliberately
 * separate from the codebase's existing generic AuditLog table (which has
 * zero real writers today, string-typed PerformedBy, and no
 * request-specific context) rather than overloading that ambiguous shared
 * table - see PR_MODULE_ARCHITECTURE_PROPOSAL.md for the reasoning.
 *
 * Uses a long/bigint Id, matching the existing AuditLog table's convention
 * for high-volume append-only rows.
 */
public class PurchaseRequisitionAuditLog
{
    public long Id { get; set; }

    [Required]
    public int PurchaseRequisitionId { get; set; }

    public PurchaseRequisition PurchaseRequisition { get; set; } = null!;

    // Created, Submitted, StepApproved, StepRejected, FullyApproved,
    // PdfGenerated, SharedWithFinance, AttachmentUploaded, etc.
    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = string.Empty;

    // Null for the rare system-initiated entry; every user-initiated action
    // (including token-based email approvals, which resolve to the
    // assigned approver's user id) sets this.
    public int? PerformedByUserId { get; set; }

    public User? PerformedByUser { get; set; }

    // WebApp, EmailLink
    [Required]
    [MaxLength(20)]
    public string PerformedVia { get; set; } = "WebApp";

    public string? Details { get; set; }

    [MaxLength(50)]
    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
