using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Availability;
using PPS.LicenseManager.API.DTOs.ResourceAllocation;
using PPS.LicenseManager.API.Services.Interfaces;
using PPS.LicenseManager.API.DTOs.AssetPool;

namespace PPS.LicenseManager.API.Services;


public class AvailabilityService : IAvailabilityService
{
    private readonly ApplicationDbContext _context;
    private readonly IResourceAllocationService _resourceAllocationService;
    private readonly INotificationService _notificationService;

public async Task<bool> ReleaseAssetToPoolAsync(
    ReleaseAssetToPoolRequest request)
{
    throw new NotImplementedException();
}

    public AvailabilityService(
        ApplicationDbContext context,
        IResourceAllocationService resourceAllocationService,
        INotificationService notificationService)
    {
        _context = context;
        _resourceAllocationService = resourceAllocationService;
        _notificationService = notificationService;
}    
public async Task<IEnumerable<AvailableAssetResponse>> GetAvailableAssetsAsync()
{
    return await Task.FromResult(Enumerable.Empty<AvailableAssetResponse>());
}

public async Task<AssetPoolRequestResponse> CreateAssetPoolRequestAsync(
    CreateAssetPoolRequest request)
{
    throw new NotImplementedException();
}

public async Task<AssetPoolRequestResponse?> DecideAssetPoolRequestAsync(
    int id,
    DecideAssetPoolRequest request)
{
    throw new NotImplementedException();
}

public async Task<AssetPoolRequestResponse?> ReturnAssetToOriginalUserAsync(
    int id,
    ReturnAssetPoolRequest request)
{
    throw new NotImplementedException();
}

    public async Task<IEnumerable<UserUnavailabilityResponse>>
        GetUnavailabilitiesAsync()
    {
        var records = await _context.UserUnavailabilities
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.CreatedByUser)
            .Include(x => x.CancelledByUser)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return records.Select(MapUnavailability);
    }

    public async Task<UserUnavailabilityResponse?>
        GetUnavailabilityByIdAsync(int id)
    {
        var record = await _context.UserUnavailabilities
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.CreatedByUser)
            .Include(x => x.CancelledByUser)
            .FirstOrDefaultAsync(x => x.Id == id);

        return record == null
            ? null
            : MapUnavailability(record);
    }

    public async Task<UserUnavailabilityResponse>
        CreateUnavailabilityAsync(
            CreateUserUnavailabilityRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == request.UserId);

        if (user == null)
            throw new InvalidOperationException(
                "User not found.");

        if (!user.IsActive)
            throw new InvalidOperationException(
                "Inactive users cannot be marked unavailable.");

        var createdBy = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Id == request.CreatedByUserId);

        if (createdBy == null)
            throw new InvalidOperationException(
                "Created By user not found.");

        if (!createdBy.IsActive)
            throw new InvalidOperationException(
                "Created By user is inactive.");

        // Unavailability dates represent complete India calendar days.
        //
        // Example:
        // 27-Jul means:
        //   Start: 27-Jul 00:00 IST
        //   End:   27-Jul 23:59:59.999... IST
        //
        // Values are converted to UTC before being stored in PostgreSQL.
        var startDate =
            IndiaCalendarDayStartUtc(request.StartDate);

        var endDate =
            IndiaCalendarDayEndUtc(request.EndDate);

        if (endDate < startDate)
            throw new InvalidOperationException(
                "End date cannot be earlier than start date.");

        var overlap = await _context.UserUnavailabilities
            .AnyAsync(x =>
                x.UserId == request.UserId &&
                x.Status != "Cancelled" &&
                startDate < x.EndDate &&
                endDate > x.StartDate);

        if (overlap)
            throw new InvalidOperationException(
                "The user already has an overlapping unavailability period.");

        var record =
            new PPS.LicenseManager.API.Models.UserUnavailability
            {
                UserId = request.UserId,
                StartDate = startDate,
                EndDate = endDate,
                Reason = request.Reason.Trim(),
                Status = "Active",
                CreatedByUserId = request.CreatedByUserId,
                CreatedAt = DateTime.UtcNow
            };

        _context.UserUnavailabilities.Add(record);

        await _context.SaveChangesAsync();

        return (await GetUnavailabilityByIdAsync(record.Id))!;
    }

    public async Task<bool>
        CancelUnavailabilityAsync(
            int id,
            CancelUserUnavailabilityRequest request)
    {
        var record = await _context.UserUnavailabilities
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return false;

        if (string.Equals(
                record.Status,
                "Cancelled",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "This unavailability period is already cancelled.");
        }

        var cancelledBy = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Id == request.CancelledByUserId);

        if (cancelledBy == null)
            throw new InvalidOperationException(
                "Cancelled By user not found.");

        record.Status = "Cancelled";
        record.CancelledAt = DateTime.UtcNow;
        record.CancelledByUserId =
            request.CancelledByUserId;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<IEnumerable<AvailableLicenseResourceResponse>>
        GetAvailableLicenseResourcesAsync()
    {
        var now = DateTime.UtcNow;

        var records =
            await (
                from unavailability
                    in _context.UserUnavailabilities
                join allocation
                    in _context.ResourceAllocations
                    on unavailability.UserId
                    equals allocation.UserId
                where
                    unavailability.Status != "Cancelled" &&
                    unavailability.StartDate <= now &&
                    unavailability.EndDate >= now &&
                    allocation.IsActive &&
                    allocation.Status == "Allocated" &&
                    allocation.License.IsActive &&
                    allocation.License.AllowTemporaryCheckout &&
                    allocation.License.ExpiryDate > now
                orderby unavailability.EndDate
                select new AvailableLicenseResourceResponse
                {
                    UserUnavailabilityId =
                        unavailability.Id,

                    ResourceAllocationId =
                        allocation.Id,

                    LicenseId =
                        allocation.LicenseId,

                    LicenseAliasCode =
                        allocation.License.AliasCode,

                    SoftwareName =
                        allocation.License.Software.Name,

                    CurrentUserId =
                        allocation.UserId,

                    CurrentUserName =
                        allocation.User.FullName,

                    AssetId =
                        allocation.AssetId,

                    AssetName =
                        allocation.Asset != null
                            ? allocation.Asset.AssetName
                            : null,

                    UnavailableFrom =
                        unavailability.StartDate,

                    UnavailableTill =
                        unavailability.EndDate,

                    Reason =
                        unavailability.Reason,

                    LicenseExpiryDate =
                        allocation.License.ExpiryDate
                }
            )
            .AsNoTracking()
            .ToListAsync();

        return records;
    }

    public async Task<IEnumerable<ResourceReallocationResponse>>
        GetReallocationRequestsAsync()
    {
        var records = await _context.ResourceReallocationRequests
            .AsNoTracking()
            .Include(x => x.UserUnavailability)
                .ThenInclude(x => x!.User)
            .Include(x => x.ResourceAllocation)
                .ThenInclude(x => x.License)
                    .ThenInclude(x => x.Software)
            .Include(x => x.ResourceAllocation)
                .ThenInclude(x => x.User)
            .Include(x => x.TargetUser)
            .Include(x => x.RequestedByUser)
            .Include(x => x.DecidedByUser)
            .Include(x => x.ResultingAllocation)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return records.Select(MapReallocation);
    }

    private static readonly string[] ValidReallocationReasons =
    {
        "Unavailability", "Underutilization"
    };

    public async Task<ResourceReallocationResponse>
        CreateReallocationRequestAsync(
            CreateResourceReallocationRequest request)
    {
        var now = DateTime.UtcNow;

        var requestReason =
            string.IsNullOrWhiteSpace(request.RequestReason)
                ? "Unavailability"
                : request.RequestReason.Trim();

        if (!ValidReallocationReasons.Contains(requestReason))
            throw new InvalidOperationException(
                $"Unknown reallocation reason \"{requestReason}\".");

        PPS.LicenseManager.API.Models.UserUnavailability? unavailability = null;

        if (requestReason == "Unavailability")
        {
            if (request.UserUnavailabilityId == null)
                throw new InvalidOperationException(
                    "Select the unavailability period this reallocation is for.");

            unavailability =
                await _context.UserUnavailabilities
                    .Include(x => x.User)
                    .FirstOrDefaultAsync(
                        x => x.Id == request.UserUnavailabilityId.Value);

            if (unavailability == null)
                throw new InvalidOperationException(
                    "Unavailability record not found.");

            if (string.Equals(
                    unavailability.Status,
                    "Cancelled",
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Cannot request reallocation from a cancelled unavailability period.");
            }

            if (unavailability.StartDate > now ||
                unavailability.EndDate < now)
            {
                throw new InvalidOperationException(
                    "The selected unavailability period is not currently active.");
            }
        }
        else
        {
            // Underutilization: a manual, reason-only request - there's
            // no usage-tracking in the system yet to auto-detect this,
            // so a Super Admin/IT Admin reviews the written
            // justification (in Remarks) instead of an automated signal.
            if (request.UserUnavailabilityId != null)
                throw new InvalidOperationException(
                    "An unavailability period can't be set on an Underutilization request.");

            if (string.IsNullOrWhiteSpace(request.Remarks))
                throw new InvalidOperationException(
                    "Please explain why this license is considered underutilized.");
        }

        var allocation =
            await _context.ResourceAllocations
                .Include(x => x.User)
                .Include(x => x.License)
                    .ThenInclude(x => x.Software)
                .FirstOrDefaultAsync(
                    x => x.Id == request.ResourceAllocationId);

        if (allocation == null)
            throw new InvalidOperationException(
                "Resource allocation not found.");

        if (!allocation.IsActive ||
            !string.Equals(
                allocation.Status,
                "Allocated",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "The selected allocation is no longer active.");
        }

        if (requestReason == "Unavailability")
        {
            if (allocation.UserId != unavailability!.UserId)
                throw new InvalidOperationException(
                    "The selected allocation does not belong to the unavailable user.");

            if (!allocation.License.AllowTemporaryCheckout)
                throw new InvalidOperationException(
                    "Temporary checkout is not allowed for this license.");
        }

        if (!allocation.License.IsActive)
            throw new InvalidOperationException(
                "The selected license is inactive.");

        if (allocation.License.ExpiryDate <= now)
            throw new InvalidOperationException(
                "Expired licenses cannot be reallocated.");

        var targetUser = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Id == request.TargetUserId);

        if (targetUser == null)
            throw new InvalidOperationException(
                "Target user not found.");

        if (!targetUser.IsActive)
            throw new InvalidOperationException(
                "Target user is inactive.");

        if (targetUser.Id == allocation.UserId)
            throw new InvalidOperationException(
                "The target user already owns this allocation.");

        var requestedBy = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Id == request.RequestedByUserId);

        if (requestedBy == null)
            throw new InvalidOperationException(
                "Requested By user not found.");

        if (!requestedBy.IsActive)
            throw new InvalidOperationException(
                "Requested By user is inactive.");

        var duplicatePending =
            await _context.ResourceReallocationRequests
                .AnyAsync(x =>
                    x.ResourceAllocationId ==
                        request.ResourceAllocationId &&
                    x.Status == "Pending");

        if (duplicatePending)
            throw new InvalidOperationException(
                "A pending reallocation request already exists for this allocation.");

        var record =
            new PPS.LicenseManager.API.Models.ResourceReallocationRequest
            {
                UserUnavailabilityId = unavailability?.Id,

                RequestReason = requestReason,

                ResourceAllocationId =
                    request.ResourceAllocationId,

                TargetUserId =
                    request.TargetUserId,

                RequestedByUserId =
                    request.RequestedByUserId,

                Status = "Pending",

                Remarks =
                    string.IsNullOrWhiteSpace(request.Remarks)
                        ? null
                        : request.Remarks.Trim(),

                CreatedAt = DateTime.UtcNow
            };

        _context.ResourceReallocationRequests.Add(record);

        await _context.SaveChangesAsync();

        // Notify IT and the affected employee's assigned
        // Team Lead / Manager about the new request.
        var notifyUserId = unavailability?.UserId ?? allocation.UserId;

        var notifyTitle = requestReason == "Underutilization"
            ? "Underutilized License Reallocation Requested"
            : "License Reallocation Requested";

        var notifyBody = requestReason == "Underutilization"
            ? $"A reallocation request was raised for {allocation.User.FullName}'s " +
              $"{allocation.License.Software.Name} license, flagged as underutilized."
            : $"A temporary license reallocation request has been created for {unavailability!.User.FullName}.";

        await _notificationService.NotifyItAndReportingManagerAsync(
            notifyUserId,
            "ReallocationRequested",
            notifyTitle,
            notifyBody,
            "ResourceReallocationRequest",
            record.Id);

        var saved = await _context.ResourceReallocationRequests
            .AsNoTracking()
            .Include(x => x.UserUnavailability)
                .ThenInclude(x => x!.User)
            .Include(x => x.ResourceAllocation)
                .ThenInclude(x => x.License)
                    .ThenInclude(x => x.Software)
            .Include(x => x.ResourceAllocation)
                .ThenInclude(x => x.User)
            .Include(x => x.TargetUser)
            .Include(x => x.RequestedByUser)
            .Include(x => x.DecidedByUser)
            .FirstAsync(x => x.Id == record.Id);

        return MapReallocation(saved);
    }

    public async Task<ResourceReallocationResponse?>
        DecideReallocationRequestAsync(
            int id,
            DecideResourceReallocationRequest request)
    {
        var record = await _context.ResourceReallocationRequests
            .Include(x => x.UserUnavailability)
                .ThenInclude(x => x!.User)
            .Include(x => x.ResourceAllocation)
                .ThenInclude(x => x.License)
                    .ThenInclude(x => x.Software)
            .Include(x => x.ResourceAllocation)
                .ThenInclude(x => x.User)
            .Include(x => x.TargetUser)
            .Include(x => x.RequestedByUser)
            .Include(x => x.DecidedByUser)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return null;

        if (!string.Equals(
                record.Status,
                "Pending",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Only pending reallocation requests can be decided.");
        }

        var decidedBy = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Id == request.DecidedByUserId);

        if (decidedBy == null)
            throw new InvalidOperationException(
                "Decided By user not found.");

        if (!decidedBy.IsActive)
            throw new InvalidOperationException(
                "Decided By user is inactive.");

        var decisionTime = DateTime.UtcNow;

        // REJECT:
        // Only update the request. Never touch the allocation.
        if (!request.Approve)
        {
            record.Status = "Rejected";
            record.DecidedAt = decisionTime;
            record.DecidedByUserId =
                request.DecidedByUserId;

            record.DecisionRemarks =
                string.IsNullOrWhiteSpace(
                    request.DecisionRemarks)
                    ? null
                    : request.DecisionRemarks.Trim();

            await _context.SaveChangesAsync();

            return await LoadReallocationResponseAsync(id);
        }

        // APPROVE:
        // Revalidate everything because the state may have
        // changed after the request was originally submitted.
        var now = DateTime.UtcNow;

        var allocation = record.ResourceAllocation;
        DateTime? expectedReturnDate;
        string transferRemarks;

        if (record.RequestReason == "Unavailability")
        {
            var unavailability = record.UserUnavailability;

            if (unavailability == null)
                throw new InvalidOperationException(
                    "The unavailability period for this request could not be found.");

            if (string.Equals(
                    unavailability.Status,
                    "Cancelled",
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "The unavailability period has been cancelled.");
            }

            if (unavailability.StartDate > now ||
                unavailability.EndDate < now)
            {
                throw new InvalidOperationException(
                    "The unavailability period is no longer active.");
            }

            if (allocation.UserId != unavailability.UserId)
            {
                throw new InvalidOperationException(
                    "The allocation no longer belongs to the unavailable user.");
            }

            if (!allocation.License.AllowTemporaryCheckout)
                throw new InvalidOperationException(
                    "Temporary checkout is no longer allowed for this license.");

            // Temporary allocation cannot extend beyond the
            // unavailable employee's return date.
            var temporaryReturnDate = unavailability.EndDate;

            // Also respect the license's maximum checkout period.
            if (allocation.License.MaxCheckoutDays > 0)
            {
                var maximumCheckoutDate =
                    now.AddDays(allocation.License.MaxCheckoutDays);

                if (maximumCheckoutDate < temporaryReturnDate)
                {
                    temporaryReturnDate = maximumCheckoutDate;
                }
            }

            expectedReturnDate = temporaryReturnDate;

            transferRemarks =
                string.IsNullOrWhiteSpace(request.DecisionRemarks)
                    ? $"Temporary reallocation approved from {unavailability.User.FullName} to {record.TargetUser.FullName}."
                    : request.DecisionRemarks.Trim();
        }
        else
        {
            // Underutilization: this is a permanent reallocation, not a
            // temporary loan - there's no employee coming back to reclaim
            // it, so no forced return date is set.
            expectedReturnDate = null;

            transferRemarks =
                string.IsNullOrWhiteSpace(request.DecisionRemarks)
                    ? $"Reallocated from {allocation.User.FullName} to {record.TargetUser.FullName} " +
                      $"(underutilization: {record.Remarks})."
                    : request.DecisionRemarks.Trim();
        }

        if (!allocation.IsActive ||
            !string.Equals(
                allocation.Status,
                "Allocated",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "The original allocation is no longer active.");
        }

        if (!allocation.License.IsActive)
            throw new InvalidOperationException(
                "The license is inactive.");

        if (allocation.License.ExpiryDate <= now)
            throw new InvalidOperationException(
                "The license has expired.");

        if (!record.TargetUser.IsActive)
            throw new InvalidOperationException(
                "The target user is inactive.");

        if (record.TargetUserId == allocation.UserId)
            throw new InvalidOperationException(
                "The target user already owns this allocation.");

        var transferred =
            await _resourceAllocationService
                .TransferAsync(
                    allocation.Id,
                    new TransferResourceAllocationRequest
                    {
                        NewUserId =
                            record.TargetUserId,

                        NewAssetId =
                            allocation.AssetId,

                        TransferredByUserId =
                            request.DecidedByUserId,

                        ExpectedReturnDate =
                            expectedReturnDate,

                        Remarks =
                            transferRemarks
                    });

        if (transferred == null)
            throw new InvalidOperationException(
                "Unable to create the resulting allocation.");

        record.Status = "Approved";
        record.DecidedAt = decisionTime;
        record.DecidedByUserId =
            request.DecidedByUserId;

        record.DecisionRemarks =
            string.IsNullOrWhiteSpace(
                request.DecisionRemarks)
                ? null
                : request.DecisionRemarks.Trim();

        record.ResultingAllocationId =
            transferred.Id;

        await _context.SaveChangesAsync();

        return await LoadReallocationResponseAsync(id);
    }

    public async Task<ResourceReallocationResponse?>
        ReturnReallocationToOriginalUserAsync(
            int id,
            ReturnResourceReallocationRequest request)
    {
        var record =
            await _context.ResourceReallocationRequests
                .Include(x => x.UserUnavailability)
                    .ThenInclude(x => x!.User)
                .Include(x => x.ResourceAllocation)
                    .ThenInclude(x => x.License)
                .Include(x => x.TargetUser)
                .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return null;

        // Only an approved temporary reallocation can be returned.
        if (!string.Equals(
                record.Status,
                "Approved",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Only an approved reallocation can be returned.");
        }

        if (!record.ResultingAllocationId.HasValue)
        {
            throw new InvalidOperationException(
                "The temporary allocation could not be identified.");
        }

        // The original owner comes from the allocation that existed
        // when the temporary reallocation request was created.
        var originalUserId =
            record.ResourceAllocation.UserId;

        var originalUser =
            await _context.Users
                .FirstOrDefaultAsync(
                    x => x.Id == originalUserId);

        if (originalUser == null)
        {
            throw new InvalidOperationException(
                "Original user not found.");
        }

        if (!originalUser.IsActive)
        {
            throw new InvalidOperationException(
                "The license cannot be returned because the original user is inactive.");
        }

        var returnedBy =
            await _context.Users
                .FirstOrDefaultAsync(
                    x => x.Id == request.ReturnedByUserId);

        if (returnedBy == null)
        {
            throw new InvalidOperationException(
                "Returned By user not found.");
        }

        if (!returnedBy.IsActive)
        {
            throw new InvalidOperationException(
                "Returned By user is inactive.");
        }

        var temporaryAllocation =
            await _context.ResourceAllocations
                .Include(x => x.License)
                .FirstOrDefaultAsync(
                    x => x.Id ==
                        record.ResultingAllocationId.Value);

        if (temporaryAllocation == null)
        {
            throw new InvalidOperationException(
                "Temporary allocation not found.");
        }

        if (!temporaryAllocation.IsActive ||
            !string.Equals(
                temporaryAllocation.Status,
                "Allocated",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "The temporary allocation is no longer active.");
        }

        // Protect against returning the wrong license if allocation
        // history was modified outside this workflow.
        if (temporaryAllocation.LicenseId !=
            record.ResourceAllocation.LicenseId)
        {
            throw new InvalidOperationException(
                "The temporary allocation does not match the original license.");
        }

        if (temporaryAllocation.UserId !=
            record.TargetUserId)
        {
            throw new InvalidOperationException(
                "The temporary allocation is no longer assigned to the expected temporary user.");
        }

        var remarks =
            string.IsNullOrWhiteSpace(request.Remarks)
                ? $"Temporary license returned from {record.TargetUser.FullName} to {originalUser.FullName}."
                : request.Remarks.Trim();

        var returned =
            await _resourceAllocationService.TransferAsync(
                temporaryAllocation.Id,
                new TransferResourceAllocationRequest
                {
                    NewUserId = originalUserId,
                    NewAssetId =
                        record.ResourceAllocation.AssetId,

                    TransferredByUserId =
                        request.ReturnedByUserId,

                    ExpectedReturnDate =
                        record.ResourceAllocation
                            .ExpectedReturnDate,

                    Remarks = remarks
                });

        if (returned == null)
        {
            throw new InvalidOperationException(
                "Unable to return the license to the original user.");
        }

        // Persist the completed return lifecycle.
        record.Status = "Returned";
        record.ReturnedAt = DateTime.UtcNow;
        record.ReturnedByUserId =
            request.ReturnedByUserId;
        record.ReturnRemarks = remarks;
        record.ReturnAllocationId = returned.Id;

        await _context.SaveChangesAsync();

        return await LoadReallocationResponseAsync(id);
    }

    private async Task<ResourceReallocationResponse?>
        LoadReallocationResponseAsync(int id)
    {
        var record =
            await _context.ResourceReallocationRequests
                .AsNoTracking()
                .Include(x => x.UserUnavailability)
                    .ThenInclude(x => x!.User)
                .Include(x => x.ResourceAllocation)
                    .ThenInclude(x => x.License)
                        .ThenInclude(x => x.Software)
                .Include(x => x.ResourceAllocation)
                    .ThenInclude(x => x.User)
                .Include(x => x.TargetUser)
                .Include(x => x.RequestedByUser)
                .Include(x => x.DecidedByUser)
                .Include(x => x.ReturnedByUser)
                .Include(x => x.ResultingAllocation)
                .FirstOrDefaultAsync(x => x.Id == id);

        return record == null
            ? null
            : MapReallocation(record);
    }

    private static ResourceReallocationResponse
        MapReallocation(
            PPS.LicenseManager.API.Models.ResourceReallocationRequest record)
    {
        return new ResourceReallocationResponse
        {
            Id = record.Id,
            RequestReference = record.RequestReference,

            UserUnavailabilityId =
                record.UserUnavailabilityId,

            RequestReason =
                record.RequestReason,

            ResourceAllocationId =
                record.ResourceAllocationId,

            LicenseId =
                record.ResourceAllocation.LicenseId,

            LicenseAliasCode =
                record.ResourceAllocation.License.AliasCode,

            SoftwareName =
                record.ResourceAllocation.License.Software.Name,

            CurrentUserId =
                record.ResourceAllocation.UserId,

            CurrentUserName =
                record.ResourceAllocation.User.FullName,

            TargetUserId =
                record.TargetUserId,

            TargetUserName =
                record.TargetUser.FullName,

            RequestedByUserId =
                record.RequestedByUserId,

            RequestedBy =
                record.RequestedByUser.FullName,

            Status = record.Status,
            Remarks = record.Remarks,
            CreatedAt = record.CreatedAt,
            DecidedAt = record.DecidedAt,
            DecidedByUserId = record.DecidedByUserId,
            DecidedBy = record.DecidedByUser?.FullName,
            DecisionRemarks = record.DecisionRemarks,

            ResultingAllocationId =
                record.ResultingAllocationId,

            ResultingAllocationActive =
                record.ResultingAllocation?.IsActive,

            ReturnedAt =
                record.ReturnedAt,

            ReturnedByUserId =
                record.ReturnedByUserId,

            ReturnedBy =
                record.ReturnedByUser?.FullName,

            ReturnRemarks =
                record.ReturnRemarks,

            ReturnAllocationId =
                record.ReturnAllocationId
        };
    }

    private static UserUnavailabilityResponse
        MapUnavailability(
            PPS.LicenseManager.API.Models.UserUnavailability record)
    {
        var now = DateTime.UtcNow;

        string effectiveStatus;

        if (string.Equals(
                record.Status,
                "Cancelled",
                StringComparison.OrdinalIgnoreCase))
        {
            effectiveStatus = "Cancelled";
        }
        else if (record.StartDate > now)
        {
            effectiveStatus = "Upcoming";
        }
        else if (record.EndDate < now)
        {
            effectiveStatus = "Ended";
        }
        else
        {
            effectiveStatus = "Active";
        }

        return new UserUnavailabilityResponse
        {
            Id = record.Id,
            UserId = record.UserId,
            UserName = record.User.FullName,
            EmployeeCode = record.User.EmployeeCode,
            StartDate = record.StartDate,
            EndDate = record.EndDate,
            Reason = record.Reason,
            Status = record.Status,
            EffectiveStatus = effectiveStatus,
            CreatedByUserId = record.CreatedByUserId,
            CreatedBy = record.CreatedByUser.FullName,
            CreatedAt = record.CreatedAt,
            CancelledAt = record.CancelledAt,
            CancelledByUserId = record.CancelledByUserId,
            CancelledBy =
                record.CancelledByUser?.FullName
        };
    }

    private static readonly TimeZoneInfo IndiaTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");

    private static DateTime IndiaCalendarDayStartUtc(
        DateTime value)
    {
        // Ignore any incoming time/timezone component.
        // The frontend value represents an India calendar date.
        var indiaDate = DateTime.SpecifyKind(
            value.Date,
            DateTimeKind.Unspecified);

        return TimeZoneInfo.ConvertTimeToUtc(
            indiaDate,
            IndiaTimeZone);
    }

    private static DateTime IndiaCalendarDayEndUtc(
        DateTime value)
    {
        // End of the selected India calendar day.
        // Add one day and subtract one tick for maximum precision.
        var nextIndiaDay = DateTime.SpecifyKind(
            value.Date.AddDays(1),
            DateTimeKind.Unspecified);

        return TimeZoneInfo.ConvertTimeToUtc(
            nextIndiaDay,
            IndiaTimeZone).AddTicks(-1);
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Utc)
            return value;

        if (value.Kind == DateTimeKind.Local)
            return value.ToUniversalTime();

        return DateTime.SpecifyKind(
            value,
            DateTimeKind.Utc);
    }
}
