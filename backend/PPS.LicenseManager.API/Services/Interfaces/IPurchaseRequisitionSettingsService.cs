using PPS.LicenseManager.API.DTOs.PurchaseRequisition;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IPurchaseRequisitionSettingsService
{
    // Find-or-create the one settings row - there's no separate "seed"
    // step, the first read (or write) creates it.
    Task<PurchaseRequisitionSettingsResponse> GetAsync();

    Task<PurchaseRequisitionSettingsResponse> UpdateAsync(
        UpdatePurchaseRequisitionSettingsRequest request,
        int updatedByUserId);
}
