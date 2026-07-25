using PPS.LicenseManager.API.DTOs.AllocationRequest;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IAllocationRequestService
{
    Task<IEnumerable<AllocationRequestResponse>> GetAllAsync();

    Task<AllocationRequestResponse?> GetByIdAsync(int id);

    Task<AllocationRequestResponse> CreateAsync(CreateAllocationRequestRequest request);

    Task<AllocationRequestResponse?> UpdateAsync(int id, UpdateAllocationRequestRequest request);

    Task<bool> DeleteAsync(int id);
Task<AllocationRequestResponse?> ApproveAsync(
    int id,
    ApproveAllocationRequestRequest request);

Task<AllocationRequestResponse?> RejectAsync(
    int id,
    RejectAllocationRequestRequest request);

}
