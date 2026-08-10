namespace PPS.LicenseManager.API.DTOs.AssetAssignment;

public class AssetAssignmentResponse
{
    public int Id { get; set; }

    public int AssetId { get; set; }
    public string AssetTag { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string? HostName { get; set; }

    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;

    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    public int AssignedByUserId { get; set; }
    public string AssignedByUserName { get; set; } = string.Empty;

    public DateTime AssignedOn { get; set; }
    public DateTime? ReturnedOn { get; set; }

    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }

    public bool IsActive { get; set; }

    public int? SeatId { get; set; }
    public string? SeatCode { get; set; }
    public string? SeatName { get; set; }
    public int? OfficeFloorId { get; set; }
    public string? FloorName { get; set; }
    public string? OfficeLocationName { get; set; }
}
