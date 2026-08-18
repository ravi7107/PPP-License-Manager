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

    // GST Identification Number - optional (not every vendor is GST-
    // registered, or it may not be on file yet), shown on the Purchase
    // Requisition PDF's Vendor Information section when set. 20 chars is
    // slightly wider than a standard 15-character GSTIN to leave room for
    // formatting without another migration later.
    [MaxLength(20)]
    public string? GSTIN { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
