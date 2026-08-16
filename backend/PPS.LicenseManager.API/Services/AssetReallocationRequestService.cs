using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.AssetAssignment;
using PPS.LicenseManager.API.DTOs.AssetReallocation;
using PPS.LicenseManager.API.DTOs.ResourceAllocation;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

/*
 * A Team Lead cannot call AssetAssignmentService.TransferAsync directly
 * (that endpoint is Super Admin/IT Admin only). Instead they raise an
 * AssetReallocationRequest here; the actual move only happens once BOTH
 * a Super Admin and an IT Admin have independently approved it - at
 * which point this service calls into IAssetAssignmentService.TransferAsync
 * itself, reusing all of its existing seat-move/validation logic.
 */
public class AssetReallocationRequestService : IAssetReallocationRequestService
{
    private readonly ApplicationDbContext _context;
    private readonly IAssetAssignmentService _assetAssignmentService;
    private readonly IResourceAllocationService _resourceAllocationService;
    private readonly INotificationService _notificationService;
    private readonly IMaterialMovementService _materialMovementService;
    private readonly ILogger<AssetReallocationRequestService> _logger;

    public AssetReallocationRequestService(
        ApplicationDbContext context,
        IAssetAssignmentService assetAssignmentService,
        IResourceAllocationService resourceAllocationService,
        INotificationService notificationService,
        IMaterialMovementService materialMovementService,
        ILogger<AssetReallocationRequestService> logger)
    {
        _context = context;
        _assetAssignmentService = assetAssignmentService;
        _resourceAllocationService = resourceAllocationService;
        _notificationService = notificationService;
        _materialMovementService = materialMovementService;
        _logger = logger;
    }


    // =========================================================
    // QUERY
    // =========================================================

    private IQueryable<AssetReallocationRequest> Query()
    {
        return _context.AssetReallocationRequests
            .Include(x => x.Asset)
            .Include(x => x.CurrentAssignment)
                .ThenInclude(x => x!.User)
            .Include(x => x.RequestedByUser)
            .Include(x => x.ProposedUser)
            .Include(x => x.ProposedSeat)
                .ThenInclude(x => x!.OfficeFloor)
                    .ThenInclude(x => x.OfficeLocation)
            .Include(x => x.AdminDecidedByUser)
            .Include(x => x.ItDecidedByUser);
    }

    private static AssetReallocationRequestResponse Map(
        AssetReallocationRequest r)
    {
        return new AssetReallocationRequestResponse
        {
            Id = r.Id,

            AssetId = r.AssetId,
            AssetTag = r.Asset.AssetTag,
            AssetName = r.Asset.AssetName,
            HostName = r.Asset.HostName,

            CurrentAssignmentId = r.CurrentAssignmentId,
            CurrentUserId = r.CurrentAssignment?.UserId,
            CurrentUserName = r.CurrentAssignment?.User?.FullName,

            RequestedByUserId = r.RequestedByUserId,
            RequestedByUserName = r.RequestedByUser.FullName,

            RequestType = r.RequestType,

            ProposedUserId = r.ProposedUserId,
            ProposedUserName = r.ProposedUser?.FullName,

            ProposedSeatId = r.ProposedSeatId,
            ProposedSeatCode = r.ProposedSeat?.SeatCode,
            ProposedSeatName = r.ProposedSeat?.SeatName,
            ProposedFloorName = r.ProposedSeat?.OfficeFloor?.FloorName,
            ProposedOfficeLocationName =
                r.ProposedSeat?.OfficeFloor?.OfficeLocation?.LocationName,

            Remarks = r.Remarks,

            Status = r.Status,

            AdminDecision = r.AdminDecision,
            AdminDecidedByUserId = r.AdminDecidedByUserId,
            AdminDecidedByUserName = r.AdminDecidedByUser?.FullName,
            AdminDecidedAt = r.AdminDecidedAt,
            AdminRemarks = r.AdminRemarks,

            ItDecision = r.ItDecision,
            ItDecidedByUserId = r.ItDecidedByUserId,
            ItDecidedByUserName = r.ItDecidedByUser?.FullName,
            ItDecidedAt = r.ItDecidedAt,
            ItRemarks = r.ItRemarks,

            ResultingAssignmentId = r.ResultingAssignmentId,

            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt
        };
    }

    public async Task<IEnumerable<AssetReallocationRequestResponse>>
        GetMineAsync(int requestedByUserId)
    {
        var records = await Query()
            .Where(x => x.RequestedByUserId == requestedByUserId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return records.Select(Map);
    }

    public async Task<IEnumerable<AssetReallocationRequestResponse>>
        GetPendingAsync()
    {
        var records = await Query()
            .Where(x => x.Status == "Pending")
            .OrderBy(x => x.CreatedAt)
            .ToListAsync();

        return records.Select(Map);
    }

    public async Task<AssetReallocationRequestResponse?>
        GetByIdAsync(int id)
    {
        var record = await Query()
            .FirstOrDefaultAsync(x => x.Id == id);

        return record == null ? null : Map(record);
    }


    // =========================================================
    // CREATE (Team Lead)
    // =========================================================

    private static readonly string[] ValidRequestTypes =
    {
        "Reassign", "Reseat", "RemoteMode", "ReturnToOffice"
    };

    public async Task<AssetReallocationRequestResponse> CreateAsync(
        CreateReallocationRequest request,
        int requestedByUserId,
        bool isEntityRestricted = false,
        int? companyId = null)
    {
        if (isEntityRestricted && companyId == null)
            throw new InvalidOperationException(
                "Unable to resolve your entity - contact an administrator.");

        var requestType =
            string.IsNullOrWhiteSpace(request.RequestType)
                ? "Reassign"
                : request.RequestType;

        if (!ValidRequestTypes.Contains(requestType))
            throw new InvalidOperationException(
                $"Unknown request type \"{requestType}\".");

        var requestedBy = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == requestedByUserId);

        if (requestedBy == null || !requestedBy.IsActive)
            throw new InvalidOperationException(
                "Requesting user not found or inactive.");

        var asset = await _context.Assets
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == request.AssetId);

        if (asset == null || !asset.IsActive)
            throw new InvalidOperationException(
                "Selected asset does not exist or is inactive.");

        // Team Lead and Manager can only request reallocation for hardware
        // in their own entity (Company) - the same scoping already applied
        // everywhere else a TL/Manager reads Asset/License data. Both
        // roles share this check (EntityScopeHelper already treats them
        // identically); it isn't narrowed further to just their own
        // department, since a Manager oversees a whole entity, not one
        // department within it.
        if (isEntityRestricted &&
            (asset.Department == null ||
             asset.Department.CompanyId != companyId))
        {
            throw new InvalidOperationException(
                "You can only request reallocation for hardware in your own entity.");
        }

        var currentAssignment = await _context.AssetAssignments
            .FirstOrDefaultAsync(x =>
                x.AssetId == request.AssetId &&
                x.IsActive);

        if (currentAssignment == null)
            throw new InvalidOperationException(
                "This asset isn't currently assigned to anyone, so there's nothing to reallocate. Use Allocate instead.");

        User? proposedUser = null;

        // -----------------------------------------------------------
        // Per-type validation
        // -----------------------------------------------------------
        if (requestType == "Reassign")
        {
            if (request.ProposedUserId == null)
                throw new InvalidOperationException(
                    "Select a user to reallocate this asset to.");

            if (currentAssignment.UserId == request.ProposedUserId)
                throw new InvalidOperationException(
                    "This asset is already assigned to the selected user.");

            proposedUser = await _context.Users
                .FirstOrDefaultAsync(x => x.Id == request.ProposedUserId);

            if (proposedUser == null || !proposedUser.IsActive)
                throw new InvalidOperationException(
                    "Selected user does not exist or is inactive.");
        }
        else if (request.ProposedUserId != null)
        {
            throw new InvalidOperationException(
                $"A new user can't be set on a \"{requestType}\" request.");
        }

        if (requestType == "Reseat" && request.ProposedSeatId == null)
        {
            throw new InvalidOperationException(
                "Select a seat to move this asset to.");
        }

        if (requestType == "RemoteMode")
        {
            if (currentAssignment.WorkMode == "Remote")
                throw new InvalidOperationException(
                    "This asset is already set to Remote/WFH.");

            if (request.ProposedSeatId != null)
                throw new InvalidOperationException(
                    "A seat can't be set on a \"RemoteMode\" request - going remote always vacates the current seat.");
        }

        if (requestType == "ReturnToOffice" &&
            currentAssignment.WorkMode != "Remote")
        {
            throw new InvalidOperationException(
                "This asset isn't currently set to Remote/WFH.");
        }

        if (request.ProposedSeatId.HasValue)
        {
            var seatExists = await _context.OfficeSeats
                .AnyAsync(x => x.Id == request.ProposedSeatId.Value);

            if (!seatExists)
                throw new InvalidOperationException(
                    "Selected seat was not found.");
        }

        var record = new AssetReallocationRequest
        {
            AssetId = request.AssetId,
            CurrentAssignmentId = currentAssignment.Id,
            RequestedByUserId = requestedByUserId,
            RequestType = requestType,
            ProposedUserId = request.ProposedUserId,
            ProposedSeatId = request.ProposedSeatId,
            Remarks = request.Remarks,

            Status = "Pending",
            AdminDecision = "Pending",
            ItDecision = "Pending",

            CreatedAt = DateTime.UtcNow
        };

        _context.AssetReallocationRequests.Add(record);

        await _context.SaveChangesAsync();

        var actionDescription = requestType switch
        {
            "Reassign" =>
                $"reallocate {asset.AssetTag} ({asset.AssetName}) to {proposedUser!.FullName}",
            "Reseat" =>
                $"move {asset.AssetTag} ({asset.AssetName}) to a different seat",
            "RemoteMode" =>
                $"set {asset.AssetTag} ({asset.AssetName}) to Remote/WFH",
            "ReturnToOffice" =>
                $"return {asset.AssetTag} ({asset.AssetName}) to the office",
            _ => $"change {asset.AssetTag} ({asset.AssetName})"
        };

        // Notify against the affected user - the proposed new holder for
        // Reassign, or the asset's current holder for every other type
        // (there's no new user to notify about).
        var notifyAboutUserId =
            requestType == "Reassign"
                ? request.ProposedUserId!.Value
                : currentAssignment.UserId;

        await _notificationService.NotifyItAndReportingManagerAsync(
            notifyAboutUserId,
            "AssetReallocationRequested",
            "Hardware reallocation needs your approval",
            $"{requestedBy.FullName} requested to {actionDescription}. " +
            "Both a Super Admin and an IT Admin need to approve before it takes effect.",
            "AssetReallocationRequest",
            record.Id);

        return await GetByIdAsync(record.Id)
            ?? throw new InvalidOperationException(
                "Unable to load created reallocation request.");
    }


    // =========================================================
    // DECIDE (Super Admin / IT Admin)
    // =========================================================

    public Task<AssetReallocationRequestResponse?> DecideAsAdminAsync(
        int id,
        DecideReallocationRequest request,
        int decidedByUserId)
    {
        return DecideAsync(id, request, decidedByUserId, isAdminSide: true);
    }

    public Task<AssetReallocationRequestResponse?> DecideAsItAsync(
        int id,
        DecideReallocationRequest request,
        int decidedByUserId)
    {
        return DecideAsync(id, request, decidedByUserId, isAdminSide: false);
    }

    private async Task<AssetReallocationRequestResponse?> DecideAsync(
        int id,
        DecideReallocationRequest request,
        int decidedByUserId,
        bool isAdminSide)
    {
        // No explicit transaction here on purpose: when this decision is
        // the one that completes both approvals, TransferAsync below opens
        // its own transaction. EF Core/Npgsql doesn't support nesting a
        // second BeginTransactionAsync on the same connection, so this
        // method must not have an ambient transaction of its own when it
        // calls TransferAsync. Any decision fields set below ride along
        // with TransferAsync's SaveChangesAsync call (it saves ALL tracked
        // changes on the shared DbContext, not just its own), so the
        // decision and the resulting transfer commit or roll back together.
        var record = await _context.AssetReallocationRequests
            .Include(x => x.RequestedByUser)
            .Include(x => x.Asset)
            .Include(x => x.ProposedUser)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return null;

        if (record.Status != "Pending")
            throw new InvalidOperationException(
                $"This request has already been {record.Status.ToLowerInvariant()}.");

        var decider = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == decidedByUserId);

        if (decider == null || !decider.IsActive)
            throw new InvalidOperationException(
                "Deciding user not found or inactive.");

        var decision = request.Approve ? "Approved" : "Rejected";
        var now = DateTime.UtcNow;

        if (isAdminSide)
        {
            if (record.AdminDecision != "Pending")
                throw new InvalidOperationException(
                    "You have already decided on this request.");

            record.AdminDecision = decision;
            record.AdminDecidedByUserId = decidedByUserId;
            record.AdminDecidedAt = now;
            record.AdminRemarks = request.Remarks;
        }
        else
        {
            if (record.ItDecision != "Pending")
                throw new InvalidOperationException(
                    "You have already decided on this request.");

            record.ItDecision = decision;
            record.ItDecidedByUserId = decidedByUserId;
            record.ItDecidedAt = now;
            record.ItRemarks = request.Remarks;
        }

        record.UpdatedAt = now;

        var actionDescription = record.RequestType switch
        {
            "Reassign" => $"reallocate {record.Asset.AssetTag} to {record.ProposedUser?.FullName}",
            "Reseat" => $"move {record.Asset.AssetTag} to a different seat",
            "RemoteMode" => $"set {record.Asset.AssetTag} to Remote/WFH",
            "ReturnToOffice" => $"return {record.Asset.AssetTag} to the office",
            _ => $"change {record.Asset.AssetTag}"
        };

        // Either side rejecting rejects the whole request immediately -
        // there's no point waiting on the other approver.
        if (record.AdminDecision == "Rejected" ||
            record.ItDecision == "Rejected")
        {
            record.Status = "Rejected";

            await _context.SaveChangesAsync();

            await NotifyRequesterAsync(
                record,
                "AssetReallocationRejected",
                "Hardware reallocation request rejected",
                $"Your request to {actionDescription} was rejected by {decider.FullName}." +
                (string.IsNullOrWhiteSpace(request.Remarks)
                    ? string.Empty
                    : $" Reason: {request.Remarks}"));

            return await GetByIdAsync(record.Id);
        }

        // Both sides approved - execute the actual change now.
        if (record.AdminDecision == "Approved" &&
            record.ItDecision == "Approved")
        {
            if (record.CurrentAssignmentId == null)
                throw new InvalidOperationException(
                    "The original hardware assignment for this request no longer exists.");

            var approvalRemarks =
                $"Reallocation request #{record.Id} approved by " +
                "Super Admin and IT Admin.";

            AssetAssignmentResponse? result = record.RequestType switch
            {
                "Reassign" => await _assetAssignmentService.TransferAsync(
                    record.CurrentAssignmentId.Value,
                    new TransferAssetRequest
                    {
                        NewUserId = record.ProposedUserId!.Value,
                        SeatId = record.ProposedSeatId,
                        Remarks = approvalRemarks
                    },
                    decidedByUserId),

                "Reseat" => await _assetAssignmentService.ReseatAsync(
                    record.CurrentAssignmentId.Value,
                    record.ProposedSeatId,
                    approvalRemarks,
                    decidedByUserId),

                "RemoteMode" => await _assetAssignmentService.SetWorkModeAsync(
                    record.CurrentAssignmentId.Value,
                    "Remote",
                    null,
                    approvalRemarks,
                    decidedByUserId),

                "ReturnToOffice" => await _assetAssignmentService.SetWorkModeAsync(
                    record.CurrentAssignmentId.Value,
                    "Office",
                    record.ProposedSeatId,
                    approvalRemarks,
                    decidedByUserId),

                _ => throw new InvalidOperationException(
                    $"Unknown request type \"{record.RequestType}\".")
            };

            if (result == null)
                throw new InvalidOperationException(
                    "The original hardware assignment for this request is no longer active.");

            record.ResultingAssignmentId = result.Id;
            record.Status = "Approved";
            record.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Log a tracked Material Movement for the physical asset
            // leaving/returning to the office on a Remote/WFH toggle, so
            // "work from home" shows up as an inward/outward transaction
            // instead of being invisible outside this module - per the
            // user's decision, this bridges into the existing WFH toggle
            // here rather than adding a separate WFH concept to Material
            // Movement. Best-effort and never blocks the reallocation
            // itself, which already committed above - a logging failure
            // here must never undo an already-approved reallocation.
            if (record.RequestType == "RemoteMode" || record.RequestType == "ReturnToOffice")
            {
                try
                {
                    var movementType = record.RequestType == "RemoteMode"
                        ? "DirectOutward"
                        : "DirectInward";

                    var purpose = record.RequestType == "RemoteMode"
                        ? $"Work From Home - {result.UserName} (Asset Reallocation Request #{record.Id})"
                        : $"Returned to office - {result.UserName} (Asset Reallocation Request #{record.Id})";

                    await _materialMovementService.CreateSystemLoggedMovementAsync(
                        movementType, result.AssetId, result.UserId, purpose);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Failed to log a Material Movement for asset reallocation " +
                        "request {RequestId}'s {RequestType} action.",
                        record.Id, record.RequestType);
                }
            }

            // The system moved to a new user - its installed
            // software/license seats should move with it, so one
            // approval covers both hardware and software instead of
            // requiring a second, separate license-transfer step.
            var softwareCarryNote = string.Empty;

            if (record.RequestType == "Reassign")
            {
                softwareCarryNote = await CarrySoftwareToNewUserAsync(
                    record.AssetId,
                    record.ProposedUserId!.Value,
                    decidedByUserId,
                    record.Id);
            }

            await NotifyRequesterAsync(
                record,
                "AssetReallocationApproved",
                "Hardware reallocation request approved",
                $"Your request to {actionDescription} was approved by both " +
                "Super Admin and IT Admin, and has been completed." +
                softwareCarryNote);

            return await GetByIdAsync(record.Id);
        }

        // Only one side has decided so far - just persist that decision
        // and wait for the other approver.
        await _context.SaveChangesAsync();

        return await GetByIdAsync(record.Id);
    }

    // =========================================================
    // AUTO-CARRY SOFTWARE (moves this asset's active license
    // allocations to the new user alongside the hardware itself)
    // =========================================================

    private async Task<string> CarrySoftwareToNewUserAsync(
        int assetId,
        int newUserId,
        int actingUserId,
        int reallocationRequestId)
    {
        var activeAllocationIds = await _context.ResourceAllocations
            .Where(r => r.AssetId == assetId && r.IsActive)
            .Select(r => r.Id)
            .ToListAsync();

        if (activeAllocationIds.Count == 0)
            return string.Empty;

        var movedSoftware = new List<string>();
        var skippedSoftware = new List<string>();

        foreach (var allocationId in activeAllocationIds)
        {
            try
            {
                var moved = await _resourceAllocationService.TransferAsync(
                    allocationId,
                    new TransferResourceAllocationRequest
                    {
                        NewUserId = newUserId,
                        NewAssetId = assetId,
                        TransferredByUserId = actingUserId,
                        Remarks =
                            $"Auto-transferred with hardware reallocation #{reallocationRequestId}."
                    });

                if (moved != null)
                    movedSoftware.Add(moved.SoftwareName);
            }
            catch (InvalidOperationException ex)
            {
                // A single problem license (e.g. expired, or somehow
                // already released mid-flight) must not block the
                // hardware reallocation that already succeeded - it's
                // surfaced in the requester notification instead so a
                // Super Admin/IT Admin can sort it out separately.
                var allocation = await _context.ResourceAllocations
                    .Include(r => r.License)
                        .ThenInclude(l => l.Software)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.Id == allocationId);

                var softwareName = allocation?.License?.Software?.Name
                    ?? $"license #{allocationId}";

                skippedSoftware.Add($"{softwareName} ({ex.Message})");
            }
        }

        if (movedSoftware.Count == 0 && skippedSoftware.Count == 0)
            return string.Empty;

        var note = string.Empty;

        if (movedSoftware.Count > 0)
            note += $" Installed software moved with it: {string.Join(", ", movedSoftware)}.";

        if (skippedSoftware.Count > 0)
            note += $" Could not auto-transfer: {string.Join("; ", skippedSoftware)} - please review manually.";

        return note;
    }

    private async Task NotifyRequesterAsync(
        AssetReallocationRequest record,
        string type,
        string title,
        string message)
    {
        _context.Notifications.Add(
            new Notification
            {
                UserId = record.RequestedByUserId,
                Type = type,
                Title = title,
                Message = message,
                RelatedEntityType = "AssetReallocationRequest",
                RelatedEntityId = record.Id,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

        await _context.SaveChangesAsync();
    }


    // =========================================================
    // CANCEL (Team Lead withdraws their own pending request)
    // =========================================================

    public async Task<bool> CancelAsync(
        int id,
        int requestedByUserId)
    {
        var record = await _context.AssetReallocationRequests
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return false;

        if (record.RequestedByUserId != requestedByUserId)
            throw new InvalidOperationException(
                "You can only cancel your own reallocation requests.");

        if (record.Status != "Pending")
            throw new InvalidOperationException(
                $"This request has already been {record.Status.ToLowerInvariant()} and can't be cancelled.");

        record.Status = "Cancelled";
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
}
