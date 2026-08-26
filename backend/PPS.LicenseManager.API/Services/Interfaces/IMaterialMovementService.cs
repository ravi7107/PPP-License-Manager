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

    // =========================================================
    // SUBMIT / APPROVE / REJECT
    // =========================================================

    // Resolves the matching MaterialApprovalWorkflow, materializes its
    // Steps into MaterialMovementApproval rows, and moves the movement
    // from Draft to PendingApproval. Throws InvalidOperationException if
    // no active workflow matches, or if a matched workflow has a
    // Role/Department step (named-user steps only are supported - see
    // MaterialMovementService.SubmitAsync's comment).
    Task<MaterialMovementResponse?> SubmitAsync(
        int id,
        int requestedByUserId,
        string? ipAddress);

    // pdfStorageRootPath is only actually used on the approve path, when
    // the final approval step clears and a gate pass PDF is generated
    // eagerly (see MaterialMovementService.DecideAsync) - accepted on
    // both so the two wrapper methods keep sharing one signature shape,
    // same as they already share one private DecideAsync implementation.
    Task<MaterialMovementResponse?> ApproveAsync(
        int id,
        int decidingUserId,
        DecideMaterialMovementRequest request,
        string? ipAddress,
        string pdfStorageRootPath);

    Task<MaterialMovementResponse?> RejectAsync(
        int id,
        int decidingUserId,
        DecideMaterialMovementRequest request,
        string? ipAddress,
        string pdfStorageRootPath);

    // Movements currently awaiting a decision from this user at their
    // CurrentApprovalStepOrder - same shape/intent as GetMineAsync, just
    // scoped to "assigned to me to decide" instead of "requested by me".
    Task<IEnumerable<MaterialMovementListItemResponse>> GetPendingMyApprovalAsync(
        int userId);

    // =========================================================
    // DISPATCH / GATE PASS
    // =========================================================

    Task<MaterialMovementResponse?> DispatchAsync(
        int id,
        int dispatchedByUserId,
        DispatchMaterialMovementRequest request,
        string? ipAddress);

    Task<(string PhysicalPath, string FileName)?> GetGatePassPdfFileAsync(
        int id,
        string pdfStorageRootPath);

    // =========================================================
    // RGP (RETURNABLE GATE PASS) TRACKING
    // =========================================================

    // Every dispatched MovementType == "TemporaryMovement" - the type this
    // system treats as an RGP - with a computed ReturnStatus (Pending/
    // Overdue/Returned) and summary counts. "Overdue" is computed live
    // against today's date, not a stored/scheduled status.
    Task<RgpTrackingResponse> GetRgpTrackingAsync();

    // Closes out an RGP - creates the MaterialMovementReturn row if
    // DispatchAsync (or, since Phase 4, the automatic gate-pass-on-
    // approval path) hasn't already, sets it to Returned, and moves the
    // movement's own Status to "TemporaryReturned". Requires
    // Status == "Dispatched" explicitly (not just "a dispatch row
    // exists") - since Phase 4, a dispatch row can exist while a movement
    // is only "AwaitingTransfer", not yet physically sent. Throws
    // InvalidOperationException if the movement isn't a Dispatched
    // TemporaryMovement or is already marked returned.
    Task<MaterialMovementResponse?> MarkReturnedAsync(
        int id,
        int returnedByUserId,
        string? remarks,
        string? ipAddress);

    // =========================================================
    // SYSTEM-LOGGED MOVEMENTS (e.g. Work From Home via Asset Reallocation)
    // =========================================================

    // Creates an already-Completed movement with no approval steps, for
    // callers whose own workflow already carries its own approval (e.g.
    // AssetReallocationRequestService's dual Super Admin + IT Admin
    // sign-off) and shouldn't be asked to go through Material Movement's
    // approval flow a second time. Best-effort by design - a caller should
    // wrap this in try/catch and never let a logging failure block the
    // real action it's attached to. Returns null (rather than throwing) if
    // the asset has no CurrentLocationId set or no matching MaterialItem
    // exists yet, since there's nothing meaningful to log in that case.
    Task<MaterialMovementResponse?> CreateSystemLoggedMovementAsync(
        string movementType,
        int assetId,
        int requestedByUserId,
        string purpose);
}
