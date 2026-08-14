namespace PPS.LicenseManager.API.DTOs.MaterialApprovalWorkflow;

public class MaterialApprovalWorkflowStepResponse
{
    public int Id { get; set; }
    public int StepOrder { get; set; }

    // Derived, not stored - "User" if ApproverUserId is set, "Department"
    // if ApproverDepartmentId is set, otherwise "Role".
    public string ApproverType { get; set; } = string.Empty;

    public string? ApproverRole { get; set; }

    public int? ApproverUserId { get; set; }
    public string? ApproverUserName { get; set; }

    public int? ApproverDepartmentId { get; set; }
    public string? ApproverDepartmentName { get; set; }

    public bool IsMandatory { get; set; }
}
