using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class ApprovalStageAssignment
{
    [Required]
    [Range(1, 3, ErrorMessage = "Approval stage order must be between 1 and 3.")]
    public int StepOrder { get; set; }

    // Exactly one of ApproverUserId / ApproverContactId must be set -
    // validated in PurchaseRequisitionService.SubmitAsync (a data
    // annotation can't express an XOR across two nullable properties
    // cleanly). ApproverUserId targets an existing system User;
    // ApproverContactId targets a standalone PurchaseRequisitionContact
    // (external, no login - can only ever decide via the emailed link).
    public int? ApproverUserId { get; set; }

    public int? ApproverContactId { get; set; }
}

/*
 * The requester names a specific approver per stage at submission time
 * (not a role) - see PR_MODULE_ARCHITECTURE_PROPOSAL.md. 1-3 sequential
 * stages; StepOrder values must be a contiguous 1..N run with no repeats,
 * enforced in PurchaseRequisitionService.SubmitAsync.
 */
public class SubmitPurchaseRequisitionRequest
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one approval stage is required.")]
    [MaxLength(3, ErrorMessage = "A purchase requisition can have at most 3 approval stages.")]
    public List<ApprovalStageAssignment> ApprovalStages { get; set; } = new();
}
