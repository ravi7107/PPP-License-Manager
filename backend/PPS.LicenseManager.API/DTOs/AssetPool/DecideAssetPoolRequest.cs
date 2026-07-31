using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetPool;

public class DecideAssetPoolRequest
{
    [Required]
    public bool Approve { get; set; }

    [Required]
    public int DecidedByUserId { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
