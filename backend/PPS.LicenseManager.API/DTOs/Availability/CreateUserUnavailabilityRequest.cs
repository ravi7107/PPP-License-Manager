using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Availability;

public class CreateUserUnavailabilityRequest
{
    [Required]
    public int UserId { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    [Required]
    public int CreatedByUserId { get; set; }
}
