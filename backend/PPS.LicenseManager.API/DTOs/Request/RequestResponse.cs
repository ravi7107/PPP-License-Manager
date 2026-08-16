namespace PPS.LicenseManager.API.DTOs.Request;

public class RequestResponse
{
    public int Id { get; set; }

    public string RequestType { get; set; } = string.Empty;

    public int RequesterId { get; set; }
    public string RequesterName { get; set; } = string.Empty;

    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    public int? SoftwareId { get; set; }
    public string? SoftwareName { get; set; }

    public string AllocationType { get; set; } = string.Empty;

    public int? AssetId { get; set; }
    public string? AssetName { get; set; }

    public int? CompanyId { get; set; }
    public string? CompanyName { get; set; }

    public int? ClientId { get; set; }
    public string? ClientName { get; set; }

    public int? TargetUserId { get; set; }
    public string? TargetUserName { get; set; }

    public string? Justification { get; set; }

    public DateTime RequestedDate { get; set; }

    public int? DurationDays { get; set; }

    public string Status { get; set; } = string.Empty;

    public string Priority { get; set; } = string.Empty;

    public DateTime? RequiredFromDate { get; set; }

    public DateTime? RequiredUntilDate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
