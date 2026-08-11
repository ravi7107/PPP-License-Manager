namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class PurchaseRequisitionApprovalStepResponse
{
    public int Id { get; set; }
    public int StepOrder { get; set; }
    public int AssignedApproverUserId { get; set; }
    public string AssignedApproverUserName { get; set; } = string.Empty;

    // Pending, Approved, Rejected, Skipped
    public string Status { get; set; } = string.Empty;
    public DateTime? DecidedAt { get; set; }
    public string? Remarks { get; set; }
}
