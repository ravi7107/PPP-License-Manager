namespace PPS.LicenseManager.API.DTOs.AllocationRequest;

public class AllocationRequestResponse
{
    public int Id { get; set; }

    public Guid RequestReference { get; set; }

    public int SoftwareId { get; set; }
    public string SoftwareName { get; set; } = string.Empty;

    public int RequestedByUserId { get; set; }
    public string RequestedByUserName { get; set; } = string.Empty;

    public int? AssetId { get; set; }
    public string? AssetName { get; set; }

    public string BusinessJustification { get; set; } = string.Empty;

    public DateTime RequiredFrom { get; set; }

    public DateTime? RequiredTill { get; set; }

    public string Priority { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? Remarks { get; set; }

    public DateTime CreatedAt { get; set; }
}
