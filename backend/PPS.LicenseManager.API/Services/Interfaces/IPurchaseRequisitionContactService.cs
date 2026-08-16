using PPS.LicenseManager.API.DTOs.PurchaseRequisition;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IPurchaseRequisitionContactService
{
    // contactType/companyId are optional filters - used by the submit-flow
    // candidate picker (ContactType in Approver/Both or Initiator/Both) as
    // well as the plain admin list view (no filters).
    Task<IEnumerable<PurchaseRequisitionContactResponse>> GetAllAsync(
        string? contactType = null,
        bool activeOnly = false);

    Task<PurchaseRequisitionContactResponse?> GetByIdAsync(int id);

    Task<PurchaseRequisitionContactResponse> CreateAsync(
        CreatePurchaseRequisitionContactRequest request,
        int? createdByUserId);

    Task<PurchaseRequisitionContactResponse?> UpdateAsync(
        int id,
        UpdatePurchaseRequisitionContactRequest request);

    Task<bool> DeleteAsync(int id);
}
