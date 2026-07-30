using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Availability;

public class CreateResourceReallocationRequest
{
    [Required]
    public int UserUnavailabilityId { get; set; }

    [Required]
    public int ResourceAllocationId { get; set; }

    [Required]
    public int TargetUserId { get; set; }

    [Required]
    public int RequestedByUserId { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
