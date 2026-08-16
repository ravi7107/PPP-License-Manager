namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

public class MaterialMovementApprovalResponse
{
    public int Id { get; set; }
    public int StepOrder { get; set; }

    public int? ApproverUserId { get; set; }
    public string? ApproverUserName { get; set; }

    public string Status { get; set; } = string.Empty;
    public DateTime? ActionedAt { get; set; }
    public string? Comments { get; set; }
}
