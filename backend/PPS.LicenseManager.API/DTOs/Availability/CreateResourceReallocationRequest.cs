using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Availability;

public class CreateResourceReallocationRequest
{
    // Required when RequestReason is "Unavailability"; must be omitted
    // for "Underutilization" requests.
    public int? UserUnavailabilityId { get; set; }

    // "Unavailability" (default, for backward compatibility) or
    // "Underutilization". For "Underutilization", Remarks is required
    // and doubles as the written justification for the reallocation.
    [MaxLength(30)]
    public string RequestReason { get; set; } = "Unavailability";

    [Required]
    public int ResourceAllocationId { get; set; }

    [Required]
    public int TargetUserId { get; set; }

    [Required]
    public int RequestedByUserId { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
