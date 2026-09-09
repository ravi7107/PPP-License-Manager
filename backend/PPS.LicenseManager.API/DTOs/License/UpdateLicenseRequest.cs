using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.License;

public class UpdateLicenseRequest
{
    [Required]
    [MaxLength(30)]
    public string AliasCode { get; set; } = string.Empty;

    [Required]
    public int SoftwareId { get; set; }

    // Commercial purchase/batch this license belongs to.
    public int? LicensePurchaseId { get; set; }

    // Not every license is tied to a person's email - a hardware/serial-
    // locked license (e.g. a per-machine product key) has no email at
    // all here, so this deliberately isn't constrained to look like an
    // email address (no [EmailAddress]) - just required and length-
    // capped, matching CreateLicenseRequest's own relaxation of the same
    // field.
    [Required]
    [MaxLength(100)]
    public string LicensedEmail { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? SubscriptionId { get; set; }

    public string Status { get; set; } = "Available";

    public bool AllowTemporaryCheckout { get; set; }

    [Range(1, 365)]
    public int MaxCheckoutDays { get; set; }

    public DateTime PurchaseDate { get; set; }

    public DateTime ExpiryDate { get; set; }

    [Range(0, double.MaxValue)]
    public decimal PurchaseCost { get; set; }

    public bool IsActive { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    [MaxLength(20)]
    public string PurchasedBy { get; set; } = "Entity";
}
