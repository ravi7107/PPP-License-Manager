using PPS.LicenseManager.API.DTOs.AssetAssignment;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IAssetAssignmentService
{
    Task<IEnumerable<AssetAssignmentResponse>> GetCurrentAsync();

    Task<AssetAssignmentResponse?> GetByIdAsync(int id);

    Task<IEnumerable<AssetAssignmentResponse>>
        GetHistoryByAssetIdAsync(int assetId);

    Task<IEnumerable<AssetAssignmentResponse>>
        GetByUserIdAsync(int userId);

    Task<AssetAssignmentResponse> AssignAsync(
        AssignAssetRequest request,
        int assignedByUserId);

    Task<AssetAssignmentResponse?> TransferAsync(
        int id,
        TransferAssetRequest request,
        int transferredByUserId);

    Task<bool> ReturnAsync(
        int id,
        ReturnAssetRequest request);

    Task<AssetAssignmentResponse?> ReseatAsync(
        int id,
        int? seatId,
        string? remarks,
        int actingUserId);

    Task<AssetAssignmentResponse?> SetWorkModeAsync(
        int id,
        string workMode,
        int? seatId,
        string? remarks,
        int actingUserId);
}
