using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class UpdatePurchaseRequisitionSettingsRequest
{
    // Nullable/blank is allowed - clears the Finance email (the not-yet-
    // built Phase 2 "notify Finance" step skips with a log line rather
    // than failing when this is unset).
    [StringLength(200)]
    [EmailAddress]
    public string? FinanceNotificationEmail { get; set; }
}
