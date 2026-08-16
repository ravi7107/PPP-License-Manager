namespace PPS.LicenseManager.API.DTOs.Request;

public class RequestApprovalResponse
{
    public int Id { get; set; }

    public int RequestId { get; set; }

    public string ApproverName { get; set; } = string.Empty;

    public string Decision { get; set; } = string.Empty;

    public string? Comment { get; set; }

    public DateTime DecidedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}
