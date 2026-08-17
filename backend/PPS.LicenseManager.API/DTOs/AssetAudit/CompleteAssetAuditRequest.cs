using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetAudit;

public class CompleteAssetAuditRequest
{
    [MaxLength(500)]
    public string? Remarks { get; set; }
}
