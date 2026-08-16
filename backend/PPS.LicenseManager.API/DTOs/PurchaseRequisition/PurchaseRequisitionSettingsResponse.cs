namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class PurchaseRequisitionSettingsResponse
{
    public string? FinanceNotificationEmail { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? UpdatedByUserName { get; set; }
}
