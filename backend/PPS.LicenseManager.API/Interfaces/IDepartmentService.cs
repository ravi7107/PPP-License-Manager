using PPS.LicenseManager.API.DTOs.Department;

namespace PPS.LicenseManager.API.Interfaces;

public interface IDepartmentService
{
    Task<IEnumerable<DepartmentResponse>> GetAllAsync();

    Task<DepartmentResponse?> GetByIdAsync(int id);

    Task<DepartmentResponse> CreateAsync(
        CreateDepartmentRequest request);

    Task<DepartmentResponse?> UpdateAsync(
        int id,
        UpdateDepartmentRequest request);

    Task<bool> DeleteAsync(int id);
}
