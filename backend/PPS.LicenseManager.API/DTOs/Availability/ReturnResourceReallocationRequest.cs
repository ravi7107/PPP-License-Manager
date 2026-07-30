using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Availability;

public class ReturnResourceReallocationRequest
{
    [Required]
    public int ReturnedByUserId { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
