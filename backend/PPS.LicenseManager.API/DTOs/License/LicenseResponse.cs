namespace PPS.LicenseManager.API.DTOs.License;

public class LicenseResponse
{
    public int Id { get; set; }

    public string AliasCode { get; set; } = string.Empty;

    public int SoftwareId { get; set; }

    public string SoftwareName { get; set; } = string.Empty;

    public int? LicensePurchaseId { get; set; }

    public string? PurchaseReference { get; set; }

    public string LicensedEmail { get; set; } = string.Empty;

    public string? SubscriptionId { get; set; }

    public string Status { get; set; } = string.Empty;

    public bool AllowTemporaryCheckout { get; set; }

    public int MaxCheckoutDays { get; set; }

    public DateTime PurchaseDate { get; set; }

    public DateTime ExpiryDate { get; set; }

    public decimal PurchaseCost { get; set; }

    public bool IsActive { get; set; }

    public string? Remarks { get; set; }
}
