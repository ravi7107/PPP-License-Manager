using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class Vendor
{
    public int Id { get; set; }

    [Required]
    [MaxLength(20)]
    public string VendorCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string VendorName { get; set; } = string.Empty;

    [MaxLength(150)]
    public string? ContactPerson { get; set; }

    [EmailAddress]
    [MaxLength(150)]
    public string? Email { get; set; }

    [MaxLength(30)]
    public string? Phone { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
