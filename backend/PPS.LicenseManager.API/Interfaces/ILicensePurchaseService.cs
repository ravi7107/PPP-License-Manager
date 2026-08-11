using PPS.LicenseManager.API.DTOs.LicensePurchase;

namespace PPS.LicenseManager.API.Interfaces;

public interface ILicensePurchaseService
{
    Task<List<LicensePurchaseResponse>> GetAllAsync(
        bool isEntityRestricted = false,
        int? companyId = null);

    Task<LicensePurchaseResponse?> GetByIdAsync(int id);

    Task<LicensePurchaseResponse> CreateAsync(
        CreateLicensePurchaseRequest request);

    Task<bool> UpdateAsync(
        int id,
        UpdateLicensePurchaseRequest request);

    Task<bool> DeleteAsync(int id);
}
