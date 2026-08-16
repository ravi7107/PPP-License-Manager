namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * Lightweight candidate lookup for the "pick an approver for this stage"
 * dropdown at submit time - scoped to the requester's own company
 * (see PurchaseRequisitionService.GetApproverCandidatesAsync), and
 * intentionally excludes the requester themselves (no self-approval).
 *
 * A candidate is either an existing system User or a standalone
 * PurchaseRequisitionContact (external, no login) - CandidateType tells
 * the frontend which one Id refers to, so it submits ApproverUserId or
 * ApproverContactId accordingly.
 */
public class PurchaseRequisitionApproverCandidateResponse
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }

    // "User" or "Contact"
    public string CandidateType { get; set; } = "User";
}
