namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * Lightweight row shape for the current user's "Pending Approvals" queue -
 * one row per purchase requisition currently awaiting THEIR decision (not
 * one row per approval step in general).
 */
public class PurchaseRequisitionPendingApprovalResponse
{
    public int Id { get; set; }
    public string? PrNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string RequestedByUserName { get; set; } = string.Empty;
    public int StepOrder { get; set; }
    public int RequiredApprovalStageCount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public DateTime? SubmittedAt { get; set; }
}
