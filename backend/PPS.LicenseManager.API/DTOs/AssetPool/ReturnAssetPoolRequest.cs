using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetPool;

public class ReturnAssetPoolRequest
{
    [Required]
    public int ReturnedByUserId { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
