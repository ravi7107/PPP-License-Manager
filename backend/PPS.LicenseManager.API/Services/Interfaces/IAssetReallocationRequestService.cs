using PPS.LicenseManager.API.DTOs.AssetReallocation;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IAssetReallocationRequestService
{
    Task<IEnumerable<AssetReallocationRequestResponse>>
        GetMineAsync(int requestedByUserId);

    Task<IEnumerable<AssetReallocationRequestResponse>>
        GetPendingAsync();

    Task<AssetReallocationRequestResponse?>
        GetByIdAsync(int id);

    Task<AssetReallocationRequestResponse> CreateAsync(
        CreateReallocationRequest request,
        int requestedByUserId,
        bool isEntityRestricted = false,
        int? companyId = null);

    Task<AssetReallocationRequestResponse?> DecideAsAdminAsync(
        int id,
        DecideReallocationRequest request,
        int decidedByUserId);

    Task<AssetReallocationRequestResponse?> DecideAsItAsync(
        int id,
        DecideReallocationRequest request,
        int decidedByUserId);

    Task<bool> CancelAsync(
        int id,
        int requestedByUserId);
}
