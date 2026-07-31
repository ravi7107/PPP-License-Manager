namespace PPS.LicenseManager.API.DTOs.AssetPool;

public class AssetPoolRequestResponse
{
    public int Id { get; set; }

    public int AssetId { get; set; }

    public string AssetCode { get; set; } = string.Empty;

    public string AssetName { get; set; } = string.Empty;

    public int RequestedByUserId { get; set; }

    public string RequestedBy { get; set; } = string.Empty;

    public int RequestedForUserId { get; set; }

    public string RequestedFor { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public string? DecisionRemarks { get; set; }
}
