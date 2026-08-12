namespace PPS.LicenseManager.API.DTOs.OfficeLocation;

public class OfficeSeatResponse
{
    public int Id { get; set; }

    public int OfficeFloorId { get; set; }

    public string FloorCode { get; set; } = string.Empty;

    public string FloorName { get; set; } = string.Empty;

    public int OfficeLocationId { get; set; }

    public string OfficeLocationName { get; set; } = string.Empty;

    public int CompanyId { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    public string SeatCode { get; set; } = string.Empty;

    public string SeatName { get; set; } = string.Empty;

    public int? DepartmentId { get; set; }

    public string? DepartmentName { get; set; }

    public int? AssetId { get; set; }

    public string? AssetTag { get; set; }

    public string? AssetName { get; set; }

    public string? HostName { get; set; }

    public int? UserId { get; set; }

    public string? UserName { get; set; }

    public string? EmployeeCode { get; set; }

    public decimal? XPosition { get; set; }

    public decimal? YPosition { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
