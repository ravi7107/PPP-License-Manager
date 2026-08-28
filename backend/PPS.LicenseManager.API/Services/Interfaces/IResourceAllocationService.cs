using PPS.LicenseManager.API.DTOs.ResourceAllocation;

namespace PPS.LicenseManager.API.Services.Interfaces
{
    public interface IResourceAllocationService
    {
        Task<IEnumerable<ResourceAllocationResponse>> GetAllAsync();
        Task<IEnumerable<ResourceAllocationResponse>> GetHistoryByLicenseIdAsync(int licenseId);
        // Phase 11 - active (IsActive=true) allocations tied directly to one
        // asset (ResourceAllocation.AssetId == assetId), for the "Allocated
        // Licenses" section on the Asset detail views (Hardware page +
        // Office Floor Map). Scoped to this asset's own device-tied
        // allocations only - not every license the asset's current user
        // holds, which may include licenses with no AssetId at all.
        Task<IEnumerable<ResourceAllocationResponse>> GetActiveByAssetIdAsync(int assetId);
        Task<ResourceAllocationResponse?> GetByIdAsync(int id);
        Task<ResourceAllocationResponse> CreateAsync(CreateResourceAllocationRequest request);
        Task<ResourceAllocationResponse?> UpdateAsync(int id, UpdateResourceAllocationRequest request);
        Task<bool> DeleteAsync(int id);
        Task<bool> ReleaseAsync(int id, ReleaseResourceAllocationRequest request);
        Task<ResourceAllocationResponse?> TransferAsync(
            int id,
            TransferResourceAllocationRequest request);
    }
}
