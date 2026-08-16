using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Request;

public class CreateRequestRequest
{
    [Required]
    [MaxLength(40)]
    public string RequestType { get; set; } = "New License";

    [Required]
    public int RequesterId { get; set; }

    public int? DepartmentId { get; set; }

    public int? SoftwareId { get; set; }

    [Required]
    [MaxLength(20)]
    public string AllocationType { get; set; } = "User";

    public int? AssetId { get; set; }

    public int? CompanyId { get; set; }

    public int? ClientId { get; set; }

    public int? TargetUserId { get; set; }

    [MaxLength(1000)]
    public string? Justification { get; set; }

    public DateTime? RequestedDate { get; set; }

    public int? DurationDays { get; set; }

    [MaxLength(20)]
    public string Priority { get; set; } = "Medium";

    public DateTime? RequiredFromDate { get; set; }

    public DateTime? RequiredUntilDate { get; set; }
}
