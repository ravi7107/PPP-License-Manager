namespace PPS.LicenseManager.API.DTOs.AssetReallocation;

public class AssetReallocationRequestResponse
{
    public int Id { get; set; }

    public int AssetId { get; set; }
    public string AssetTag { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string? HostName { get; set; }

    public int? CurrentAssignmentId { get; set; }
    public int? CurrentUserId { get; set; }
    public string? CurrentUserName { get; set; }

    public int RequestedByUserId { get; set; }
    public string RequestedByUserName { get; set; } = string.Empty;

    public int ProposedUserId { get; set; }
    public string ProposedUserName { get; set; } = string.Empty;

    public int? ProposedSeatId { get; set; }
    public string? ProposedSeatCode { get; set; }
    public string? ProposedSeatName { get; set; }
    public string? ProposedFloorName { get; set; }
    public string? ProposedOfficeLocationName { get; set; }

    public string? Remarks { get; set; }

    public string Status { get; set; } = string.Empty;

    public string AdminDecision { get; set; } = string.Empty;
    public int? AdminDecidedByUserId { get; set; }
    public string? AdminDecidedByUserName { get; set; }
    public DateTime? AdminDecidedAt { get; set; }
    public string? AdminRemarks { get; set; }

    public string ItDecision { get; set; } = string.Empty;
    public int? ItDecidedByUserId { get; set; }
    public string? ItDecidedByUserName { get; set; }
    public DateTime? ItDecidedAt { get; set; }
    public string? ItRemarks { get; set; }

    public int? ResultingAssignmentId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
