using PPS.LicenseManager.API.DTOs.Company;

namespace PPS.LicenseManager.API.Interfaces;

public interface ICompanyService
{
    Task<IEnumerable<CompanyResponse>> GetAllAsync();

    Task<CompanyResponse?> GetByIdAsync(int id);

    Task<CompanyResponse> CreateAsync(CreateCompanyRequest request);

    Task<CompanyResponse?> UpdateAsync(int id, UpdateCompanyRequest request);

    Task<bool> DeleteAsync(int id);
}
