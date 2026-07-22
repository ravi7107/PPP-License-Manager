namespace PPS.LicenseManager.API.DTOs.Vendor;

public class VendorResponse
{
    public int Id { get; set; }

    public string VendorCode { get; set; } = string.Empty;

    public string VendorName { get; set; } = string.Empty;

    public string? ContactPerson { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}
