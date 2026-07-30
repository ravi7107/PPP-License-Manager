using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.LicensePurchase;

public class CreateLicensePurchaseRequest
{
    [Required]
    public int SoftwareId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Vendor { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string LicenseType { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? LicenseKey { get; set; }

    [Range(1, int.MaxValue)]
    public int TotalLicenses { get; set; }

    [Required]
    public DateOnly PurchaseDate { get; set; }

    public DateOnly? ExpiryDate { get; set; }

    public DateOnly? SupportExpiryDate { get; set; }

    public int? CompanyId { get; set; }

    public int? DepartmentId { get; set; }

    public int? ClientId { get; set; }

    [Required]
    [MaxLength(20)]
    public string PurchasedByType { get; set; } = "Entity";

    [Required]
    [MaxLength(20)]
    public string PurchaseScope { get; set; } = "Organization";

    [MaxLength(50)]
    public string? PONumber { get; set; }

    [MaxLength(50)]
    public string? InvoiceNumber { get; set; }

    [MaxLength(50)]
    public string? ContractNumber { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? Cost { get; set; }

    [MaxLength(10)]
    public string? Currency { get; set; }

    [MaxLength(100)]
    public string? PurchaseSource { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
