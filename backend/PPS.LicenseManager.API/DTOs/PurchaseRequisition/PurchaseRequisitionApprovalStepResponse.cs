namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * A step's approver is either an existing system User or a standalone
 * PurchaseRequisitionContact (external, no login - see
 * PurchaseRequisitionApprovalStep's model comment) - exactly one of
 * AssignedApproverUserId/AssignedApproverContactId is set, mirrored by
 * ApproverType ("User" or "Contact") so the frontend doesn't have to
 * infer it. AssignedApproverName/Email always reflect whichever one is
 * actually assigned.
 */
public class PurchaseRequisitionApprovalStepResponse
{
    public int Id { get; set; }
    public int StepOrder { get; set; }

    public int? AssignedApproverUserId { get; set; }
    public int? AssignedApproverContactId { get; set; }
    public string ApproverType { get; set; } = "User";

    public string AssignedApproverUserName { get; set; } = string.Empty;
    public string? AssignedApproverEmail { get; set; }

    // Pending, Approved, Rejected, Skipped
    public string Status { get; set; } = string.Empty;
    public DateTime? DecidedAt { get; set; }
    public string? Remarks { get; set; }
}
