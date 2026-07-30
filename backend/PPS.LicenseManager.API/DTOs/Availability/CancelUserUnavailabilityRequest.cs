using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Availability;

public class CancelUserUnavailabilityRequest
{
    [Required]
    public int CancelledByUserId { get; set; }
}
