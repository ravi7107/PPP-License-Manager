using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class Software
{
    public int Id { get; set; }

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

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<AssetSoftware> AssetSoftwares { get; set; } = new List<AssetSoftware>();
}
