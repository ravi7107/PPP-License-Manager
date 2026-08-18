using System.Text.Json.Serialization;

namespace PPS.LicenseManager.API.DTOs.Vendor;

public class VendorResponse
{
    public int Id { get; set; }

    public string VendorCode { get; set; } = string.Empty;

    public string VendorName { get; set; } = string.Empty;

    public string? ContactPerson { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? Address { get; set; }

    // Explicit JSON name - System.Text.Json's camelCase policy handling
    // of an all-caps acronym like "GSTIN" isn't worth leaving implicit;
    // this pins the wire format to "gstin" regardless.
    [JsonPropertyName("gstin")]
    public string? GSTIN { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}
