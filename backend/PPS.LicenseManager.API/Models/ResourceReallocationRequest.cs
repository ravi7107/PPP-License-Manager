using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class ResourceReallocationRequest
{
    public int Id { get; set; }

    public Guid RequestReference { get; set; } = Guid.NewGuid();

    [Required]
    public int UserUnavailabilityId { get; set; }

    public UserUnavailability UserUnavailability { get; set; } = null!;

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
