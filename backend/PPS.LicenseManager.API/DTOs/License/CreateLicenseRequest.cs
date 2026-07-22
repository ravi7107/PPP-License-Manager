using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.License;

public class CreateLicenseRequest
{
    [Required]
    [MaxLength(30)]
    public string AliasCode { get; set; } = string.Empty;

    [Required]
    public int SoftwareId { get; set; }

    [Required]
    [EmailAddress]
    [MaxLength(100)]
    public string LicensedEmail { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? SubscriptionId { get; set; }

    public bool AllowTemporaryCheckout { get; set; } = true;

    [Range(1, 365)]
    public int MaxCheckoutDays { get; set; } = 5;

    [Required]
    public DateTime PurchaseDate { get; set; }

    [Required]
    public DateTime ExpiryDate { get; set; }

    [Range(0, double.MaxValue)]
    public decimal PurchaseCost { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
