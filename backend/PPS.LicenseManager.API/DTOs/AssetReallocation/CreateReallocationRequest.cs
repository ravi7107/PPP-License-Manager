using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetReallocation;

public class CreateReallocationRequest
{
    [Required]
    public int AssetId { get; set; }

    [Required]
    public int ProposedUserId { get; set; }

    // Optional office floor-map seat the asset should move to once the
    // request is approved. Null keeps the asset unseated / unseats it.
    public int? ProposedSeatId { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
