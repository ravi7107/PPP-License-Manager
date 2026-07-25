using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class License
{
    public int Id { get; set; }

    [Required]
    [MaxLength(30)]
    public string AliasCode { get; set; } = string.Empty;

    [Required]
    public int SoftwareId { get; set; }

    public Software Software { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string LicensedEmail { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? SubscriptionId { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Available";

    public bool AllowTemporaryCheckout { get; set; } = true;

    public int MaxCheckoutDays { get; set; } = 5;

    public DateTime PurchaseDate { get; set; }

    public DateTime ExpiryDate { get; set; }

    public decimal PurchaseCost { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
