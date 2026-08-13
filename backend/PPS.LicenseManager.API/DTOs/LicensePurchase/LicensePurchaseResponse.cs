namespace PPS.LicenseManager.API.DTOs.LicensePurchase;

public class LicensePurchaseResponse
{
    public int Id { get; set; }

    public int SoftwareId { get; set; }

    public string SoftwareName { get; set; } = string.Empty;

    public string Vendor { get; set; } = string.Empty;

    public string LicenseType { get; set; } = string.Empty;

    public string? LicenseKey { get; set; }

    public int TotalLicenses { get; set; }

    public int CreatedLicenses { get; set; }

    // Quota not yet turned into a license seat-row (TotalLicenses minus
    // active License rows created under this purchase). Kept for backward
    // compatibility with existing consumers of this field.
    public int AvailableLicenses { get; set; }

    // The number of already-created license seats that can actually be
    // allocated right now (Status == "Available", active, not expired).
    // Unlike AvailableLicenses, this reflects real-time seat state - a
    // seat that's Allocated/Suspended/Expired does NOT count here even
    // though it was already "created" against the quota.
    public int FreeToAllocateLicenses { get; set; }

    public DateOnly PurchaseDate { get; set; }

    public DateOnly? ExpiryDate { get; set; }

    public DateOnly? SupportExpiryDate { get; set; }

    public int? CompanyId { get; set; }

    public string? CompanyName { get; set; }

    public int? DepartmentId { get; set; }

    public string? DepartmentName { get; set; }

    public int? ClientId { get; set; }

    public string? ClientName { get; set; }

    public string PurchasedByType { get; set; } = string.Empty;

    public string PurchaseScope { get; set; } = string.Empty;

    public string? PONumber { get; set; }

    public string? InvoiceNumber { get; set; }

    public string? ContractNumber { get; set; }

    public decimal? Cost { get; set; }

    public string? Currency { get; set; }

    public string? PurchaseSource { get; set; }

    public string? Remarks { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
