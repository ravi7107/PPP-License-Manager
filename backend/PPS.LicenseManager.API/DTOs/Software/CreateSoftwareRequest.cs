using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Software;

public class CreateSoftwareRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? Version { get; set; }

    [Required]
    [MaxLength(100)]
    public string Vendor { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string LicenseType { get; set; } = string.Empty;

    public bool IsLicenseRequired { get; set; } = true;

    public string? Description { get; set; }
}
