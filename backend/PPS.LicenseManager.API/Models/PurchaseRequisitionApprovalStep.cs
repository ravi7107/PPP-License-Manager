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
 */
public class PurchaseRequisitionApprovalStep
{
    public int Id { get; set; }

    [Required]
    public int PurchaseRequisitionId { get; set; }

    public PurchaseRequisition PurchaseRequisition { get; set; } = null!;

    public int StepOrder { get; set; }

    [Required]
    public int AssignedApproverUserId { get; set; }

    public User AssignedApproverUser { get; set; } = null!;

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
