namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * Lightweight user lookup for the "pick an approver for this stage"
 * dropdown at submit time - scoped to the requester's own company
 * (see PurchaseRequisitionService.GetApproverCandidatesAsync), and
 * intentionally excludes the requester themselves (no self-approval).
 */
public class PurchaseRequisitionApproverCandidateResponse
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
}
