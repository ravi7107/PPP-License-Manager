using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetPool;

public class CreateAssetPoolRequest
{
    [Required]
    public int TemporaryPoolId { get; set; }

    [Required]
    public int RequestedByUserId { get; set; }

    [Required]
    public int RequestedForUserId { get; set; }

    [Required]
    public DateTime RequiredFrom { get; set; }

    [Required]
    public DateTime RequiredUntil { get; set; }

    [MaxLength(500)]
    public string Purpose { get; set; } = string.Empty;
}
