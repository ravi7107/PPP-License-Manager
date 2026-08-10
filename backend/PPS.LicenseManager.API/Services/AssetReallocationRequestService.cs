using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.AssetAssignment;
using PPS.LicenseManager.API.DTOs.AssetReallocation;
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
    private readonly INotificationService _notificationService;

    public AssetReallocationRequestService(
        ApplicationDbContext context,
        IAssetAssignmentService assetAssignmentService,
        INotificationService notificationService)
    {
        _context = context;
        _assetAssignmentService = assetAssignmentService;
        _notificationService = notificationService;
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

            ProposedUserId = r.ProposedUserId,
            ProposedUserName = r.ProposedUser.FullName,

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

    public async Task<AssetReallocationRequestResponse> CreateAsync(
        CreateReallocationRequest request,
        int requestedByUserId)
    {
        var requestedBy = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == requestedByUserId);

        if (requestedBy == null || !requestedBy.IsActive)
            throw new InvalidOperationException(
                "Requesting user not found or inactive.");

        var asset = await _context.Assets
            .FirstOrDefaultAsync(x => x.Id == request.AssetId);

        if (asset == null || !asset.IsActive)
            throw new InvalidOperationException(
                "Selected asset does not exist or is inactive.");

        // A Team Lead can only request reallocation for hardware in their
        // own department - the same scoping already applied to what they
        // can see on the Hardware page.
        if (requestedBy.DepartmentId.HasValue &&
            asset.DepartmentId != requestedBy.DepartmentId.Value)
        {
            throw new InvalidOperationException(
                "You can only request reallocation for hardware in your own department.");
        }

        var currentAssignment = await _context.AssetAssignments
            .FirstOrDefaultAsync(x =>
                x.AssetId == request.AssetId &&
                x.IsActive);

        if (currentAssignment == null)
            throw new InvalidOperationException(
                "This asset isn't currently assigned to anyone, so there's nothing to reallocate. Use Allocate instead.");

        if (currentAssignment.UserId == request.ProposedUserId)
            throw new InvalidOperationException(
                "This asset is already assigned to the selected user.");

        var proposedUser = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == request.ProposedUserId);

        if (proposedUser == null || !proposedUser.IsActive)
            throw new InvalidOperationException(
                "Selected user does not exist or is inactive.");

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

        await _notificationService.NotifyItAndReportingManagerAsync(
            request.ProposedUserId,
            "AssetReallocationRequested",
            "Hardware reallocation needs your approval",
            $"{requestedBy.FullName} requested to reallocate {asset.AssetTag} " +
            $"({asset.AssetName}) to {proposedUser.FullName}. " +
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
                $"Your request to reallocate {record.Asset.AssetTag} to " +
                $"{record.ProposedUser.FullName} was rejected by {decider.FullName}." +
                (string.IsNullOrWhiteSpace(request.Remarks)
                    ? string.Empty
                    : $" Reason: {request.Remarks}"));

            return await GetByIdAsync(record.Id);
        }

        // Both sides approved - execute the actual reallocation now.
        if (record.AdminDecision == "Approved" &&
            record.ItDecision == "Approved")
        {
            if (record.CurrentAssignmentId == null)
                throw new InvalidOperationException(
                    "The original hardware assignment for this request no longer exists.");

            var result = await _assetAssignmentService.TransferAsync(
                record.CurrentAssignmentId.Value,
                new TransferAssetRequest
                {
                    NewUserId = record.ProposedUserId,
                    SeatId = record.ProposedSeatId,
                    Remarks =
                        $"Reallocation request #{record.Id} approved by " +
                        "Super Admin and IT Admin."
                },
                decidedByUserId);

            if (result == null)
                throw new InvalidOperationException(
                    "The original hardware assignment for this request is no longer active.");

            record.ResultingAssignmentId = result.Id;
            record.Status = "Approved";
            record.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await NotifyRequesterAsync(
                record,
                "AssetReallocationApproved",
                "Hardware reallocation request approved",
                $"Your request to reallocate {record.Asset.AssetTag} to " +
                $"{record.ProposedUser.FullName} was approved by both " +
                "Super Admin and IT Admin, and has been completed.");

            return await GetByIdAsync(record.Id);
        }

        // Only one side has decided so far - just persist that decision
        // and wait for the other approver.
        await _context.SaveChangesAsync();

        return await GetByIdAsync(record.Id);
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
