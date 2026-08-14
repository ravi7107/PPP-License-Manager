using PPS.LicenseManager.API.DTOs.MaterialMovement;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IMaterialMovementService
{
    // Draft movements requested by this user - a Team Lead/Manager/
    // Employee only ever sees their own, same scoping as Purchase
    // Requisition's "mine" endpoint. Privileged roles (Super Admin/IT
    // Admin) use GetAllAsync instead.
    Task<IEnumerable<MaterialMovementListItemResponse>> GetMineAsync(
        int requestedByUserId);

    Task<IEnumerable<MaterialMovementListItemResponse>> GetAllAsync();

    Task<MaterialMovementResponse?> GetByIdAsync(
        int id,
        int requestingUserId,
        bool isPrivileged);

    Task<MaterialMovementResponse> CreateDraftAsync(
        SaveMaterialMovementRequest request,
        int requestedByUserId,
        string? ipAddress);

    Task<MaterialMovementResponse?> UpdateDraftAsync(
        int id,
        SaveMaterialMovementRequest request,
        int requestedByUserId,
        string? ipAddress);

    Task<bool> DeleteDraftAsync(
        int id,
        int requestedByUserId,
        string? ipAddress);
}
