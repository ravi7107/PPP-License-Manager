namespace PPS.LicenseManager.API.Models;

public class OfficeFloor
{
    public int Id { get; set; }

    public int OfficeLocationId { get; set; }

    public string FloorCode { get; set; } = string.Empty;

    public string FloorName { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    // Interactive floor map
    public string? MapImagePath { get; set; }

    public string? MapOriginalFileName { get; set; }

    public string? MapContentType { get; set; }

    public int? MapWidth { get; set; }

    public int? MapHeight { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } =
        DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }


    // Navigation
    public OfficeLocation OfficeLocation { get; set; } =
        null!;

    public ICollection<OfficeSeat> Seats { get; set; } =
        new List<OfficeSeat>();
}
