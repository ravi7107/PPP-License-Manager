using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetPool;

public class ReleaseAssetToPoolRequest
{
    [Required]
    public int AssetAssignmentId { get; set; }

    [Required]
    public int ReleasedByUserId { get; set; }

    [Required]
    public DateTime AvailableFrom { get; set; }

    [Required]
    public DateTime AvailableUntil { get; set; }

    [MaxLength(500)]
    public string? Reason { get; set; }
}
