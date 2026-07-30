namespace PPS.LicenseManager.API.Models;

public class OfficeSeat
{
    public int Id { get; set; }

    public int OfficeFloorId { get; set; }

    public string SeatCode { get; set; } = string.Empty;

    public string SeatName { get; set; } = string.Empty;

    public int? DepartmentId { get; set; }

    // Physical workstation assigned to this seat.
    public int? AssetId { get; set; }

    // Employee currently using this workstation.
    public int? UserId { get; set; }

    // Percentage coordinates used later by the
    // interactive seating/floor map.
    public decimal? XPosition { get; set; }

    public decimal? YPosition { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } =
        DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }


    // Navigation
    public OfficeFloor OfficeFloor { get; set; } =
        null!;

    public Department? Department { get; set; }

    public Asset? Asset { get; set; }

    public User? User { get; set; }
}
