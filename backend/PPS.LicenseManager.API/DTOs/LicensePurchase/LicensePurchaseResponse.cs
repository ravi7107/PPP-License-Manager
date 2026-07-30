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

    public int AvailableLicenses { get; set; }

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
