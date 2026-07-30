namespace PPS.LicenseManager.API.DTOs.OfficeLocation;

public class OfficeFloorResponse
{
    public int Id { get; set; }

    public int OfficeLocationId { get; set; }

    public string OfficeLocationName { get; set; } = string.Empty;

    public int CompanyId { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    public string FloorCode { get; set; } = string.Empty;

    public string FloorName { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    // Interactive floor-map metadata
    public string? MapImagePath { get; set; }

    public string? MapOriginalFileName { get; set; }

    public string? MapContentType { get; set; }

    public int? MapWidth { get; set; }

    public int? MapHeight { get; set; }

    public bool HasMap =>
        !string.IsNullOrWhiteSpace(MapImagePath);

    public bool IsActive { get; set; }

    public int SeatCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
