using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Request;

public class DecideRequestRequest
{
    [Required]
    public int ActorUserId { get; set; }

    [MaxLength(1000)]
    public string? Comment { get; set; }
}
