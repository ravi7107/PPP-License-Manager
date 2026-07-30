using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Availability;

public class DecideResourceReallocationRequest
{
    [Required]
    public int DecidedByUserId { get; set; }

    [Required]
    public bool Approve { get; set; }

    [MaxLength(500)]
    public string? DecisionRemarks { get; set; }
}
