namespace PPS.LicenseManager.API.DTOs.Software;

public class SoftwareResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Version { get; set; }

    public string Vendor { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string LicenseType { get; set; } = string.Empty;

    public bool IsLicenseRequired { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; }
}
