using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AllocationRequest;

public class UpdateAllocationRequestRequest
{
    [Required]
    public int SoftwareId { get; set; }

    [Required]
    public int RequestedByUserId { get; set; }

    public int? AssetId { get; set; }

    [Required]
    [MaxLength(1000)]
    public string BusinessJustification { get; set; } = string.Empty;

    [Required]
    public DateTime RequiredFrom { get; set; }

    public DateTime? RequiredTill { get; set; }

    [MaxLength(30)]
    public string Priority { get; set; } = "Medium";

    [MaxLength(30)]
    public string Status { get; set; } = "Pending";

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
