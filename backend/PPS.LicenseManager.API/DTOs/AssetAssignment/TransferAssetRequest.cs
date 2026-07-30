using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetAssignment;

public class TransferAssetRequest
{
    [Required]
    public int NewUserId { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
