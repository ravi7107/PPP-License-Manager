using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetAssignment;

public class AssignAssetRequest
{
    [Required]
    public int AssetId { get; set; }

    [Required]
    public int UserId { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
