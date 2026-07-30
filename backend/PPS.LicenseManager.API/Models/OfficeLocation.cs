namespace PPS.LicenseManager.API.Models;

public class OfficeLocation
{
    public int Id { get; set; }

    public int CompanyId { get; set; }

    public string LocationCode { get; set; } = string.Empty;

    public string LocationName { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    public string State { get; set; } = string.Empty;

    public string Country { get; set; } = "India";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } =
        DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }


    // Navigation
    public Company Company { get; set; } = null!;

    public ICollection<OfficeFloor> Floors { get; set; } =
        new List<OfficeFloor>();
}
