using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * One stage of a Purchase Requisition's sequential approval chain
 * (StepOrder 1-3, count fixed by PurchaseRequisition.RequiredApprovalStageCount
 * at submit time). The requester assigns a specific named approver per
 * stage - not a role - at submission. Only one step is ever "live"
 * (Pending) at a time; PurchaseRequisition.CurrentApprovalStepOrder tracks
 * which one. A rejection at any step immediately rejects the whole PR and
 * flips every still-Pending step to Skipped.
 *
 * The approver is EITHER an existing system User (AssignedApproverUserId)
 * OR a standalone PurchaseRequisitionContact with no login
 * (AssignedApproverContactId) - exactly one of the two is set, enforced by
 * a DB CHECK constraint (see the AddPurchaseRequisitionContactsAndEmail
 * migration). A Contact-assigned step can only ever be decided via the
 * emailed token link (PurchaseRequisitionApprovalToken /
 * DecideStepByTokenAsync) - there is no authenticated "self" for it to log
 * in as, so the authenticated decision endpoint always rejects it.
 */
public class PurchaseRequisitionApprovalStep
{
    public int Id { get; set; }

    [Required]
    public int PurchaseRequisitionId { get; set; }

    public PurchaseRequisition PurchaseRequisition { get; set; } = null!;

    public int StepOrder { get; set; }

    public int? AssignedApproverUserId { get; set; }

    public User? AssignedApproverUser { get; set; }

    public int? AssignedApproverContactId { get; set; }

    public PurchaseRequisitionContact? AssignedApproverContact { get; set; }

    // Pending, Approved, Rejected, Skipped
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Pending";

    public DateTime? DecidedAt { get; set; }

    // Required by the service layer when Status == Rejected; optional
    // otherwise.
    [MaxLength(500)]
    public string? Remarks { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PurchaseRequisitionApprovalToken> Tokens { get; set; } =
        new List<PurchaseRequisitionApprovalToken>();
}
