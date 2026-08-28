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

    // Phase 13 - "effective" department for Software Inventory display:
    // follows the currently-allocated user's department when this license
    // is actively allocated (ResourceAllocation), falling back to the
    // department recorded at purchase time (LicensePurchase.DepartmentId)
    // when it isn't allocated to anyone right now. Null when neither is
    // available (e.g. an unallocated license bought at Organization scope
    // with no department set).
    public int? EffectiveDepartmentId { get; set; }

    public string? EffectiveDepartmentName { get; set; }
}
