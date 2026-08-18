using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PPS.LicenseManager.API.DTOs.Vendor;

public class UpdateVendorRequest
{
    [Required]
    [MaxLength(20)]
    public string VendorCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string VendorName { get; set; } = string.Empty;

    public string? ContactPerson { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? Address { get; set; }

    [MaxLength(20)]
    [JsonPropertyName("gstin")]
    public string? GSTIN { get; set; }

    public bool IsActive { get; set; }
}
