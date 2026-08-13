namespace PPS.LicenseManager.API.DTOs.Availability;

public class ResourceReallocationResponse
{
    public int Id { get; set; }

    public Guid RequestReference { get; set; }

    public int? UserUnavailabilityId { get; set; }

    public string RequestReason { get; set; } = "Unavailability";

    public int ResourceAllocationId { get; set; }

    public int LicenseId { get; set; }

    public string LicenseAliasCode { get; set; } = string.Empty;

    public string SoftwareName { get; set; } = string.Empty;

    public int CurrentUserId { get; set; }

    public string CurrentUserName { get; set; } = string.Empty;

    public int TargetUserId { get; set; }

    public string TargetUserName { get; set; } = string.Empty;

    public int RequestedByUserId { get; set; }

    public string RequestedBy { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? Remarks { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? DecidedAt { get; set; }

    public int? DecidedByUserId { get; set; }

    public string? DecidedBy { get; set; }

    public string? DecisionRemarks { get; set; }

    public int? ResultingAllocationId { get; set; }

    public bool? ResultingAllocationActive { get; set; }

    public DateTime? ReturnedAt { get; set; }

    public int? ReturnedByUserId { get; set; }

    public string? ReturnedBy { get; set; }

    public string? ReturnRemarks { get; set; }

    public int? ReturnAllocationId { get; set; }
}
