using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetAssignment;

public class ReturnAssetRequest
{
    [MaxLength(500)]
    public string? Remarks { get; set; }
}
