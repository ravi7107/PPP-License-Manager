using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class ResourceReallocationRequest
{
    public int Id { get; set; }

    public Guid RequestReference { get; set; } = Guid.NewGuid();

    // Null when RequestReason is "Underutilization" - that path is a
    // manual, reason-only request with no unavailability period behind it.
    public int? UserUnavailabilityId { get; set; }

    public UserUnavailability? UserUnavailability { get; set; }

    // "Unavailability" (original, tied to a UserUnavailability period,
    // return-by-date) or "Underutilization" (manual - a Super Admin/IT
    // Admin reviews the written justification in Remarks; permanent,
    // no forced return date).
    [Required]
    [MaxLength(30)]
    public string RequestReason { get; set; } = "Unavailability";

    [Required]
    public int ResourceAllocationId { get; set; }

    public ResourceAllocation ResourceAllocation { get; set; } = null!;

    [Required]
    public int TargetUserId { get; set; }

    public User TargetUser { get; set; } = null!;

    [Required]
    public int RequestedByUserId { get; set; }

    public User RequestedByUser { get; set; } = null!;

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Pending";

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? DecidedAt { get; set; }

    public int? DecidedByUserId { get; set; }

    public User? DecidedByUser { get; set; }

    [MaxLength(500)]
    public string? DecisionRemarks { get; set; }

    public int? ResultingAllocationId { get; set; }

    public ResourceAllocation? ResultingAllocation { get; set; }

    // Return lifecycle
    public DateTime? ReturnedAt { get; set; }

    public int? ReturnedByUserId { get; set; }

    public User? ReturnedByUser { get; set; }

    [MaxLength(500)]
    public string? ReturnRemarks { get; set; }

    // Allocation created when the temporary license
    // is returned to the original user.
    public int? ReturnAllocationId { get; set; }

    public ResourceAllocation? ReturnAllocation { get; set; }
}
