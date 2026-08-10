using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetReallocation;

public class DecideReallocationRequest
{
    [Required]
    public bool Approve { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
