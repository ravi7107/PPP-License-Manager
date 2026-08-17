using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.AssetAudit;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class AssetAuditService : IAssetAuditService
{
    private readonly ApplicationDbContext _context;

    public AssetAuditService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AssetAuditDetailResponse> StartAsync(
        StartAssetAuditRequest request,
        int startedByUserId)
    {
        var location = await _context.OfficeLocations
            .FirstOrDefaultAsync(x => x.Id == request.LocationId);

        if (location == null)
            throw new InvalidOperationException("Location not found.");

        if (request.DepartmentId.HasValue)
        {
            var departmentExists = await _context.Departments
                .AnyAsync(x => x.Id == request.DepartmentId.Value);

            if (!departmentExists)
                throw new InvalidOperationException("Department not found.");
        }

        var expectedAssetIds = await ResolveExpectedAssetIdsAsync(
            request.LocationId,
            request.DepartmentId);

        var audit = new AssetAudit
        {
            LocationId = request.LocationId,
            DepartmentId = request.DepartmentId,
            StartedByUserId = startedByUserId,
            StartedAt = DateTime.UtcNow,
            Status = "InProgress",
            ExpectedCount = expectedAssetIds.Count,
            FoundCount = 0,
            MissingCount = expectedAssetIds.Count,
            UnexpectedCount = 0
        };

        _context.AssetAudits.Add(audit);
        await _context.SaveChangesAsync();

        foreach (var assetId in expectedAssetIds)
        {
            _context.AssetAuditItems.Add(new AssetAuditItem
            {
                AssetAuditId = audit.Id,
                AssetId = assetId,
                IsExpected = true,
                IsScanned = false,
                ResultState = "Missing"
            });
        }

        await _context.SaveChangesAsync();

        return (await GetAsync(audit.Id))!;
    }

    public async Task<AssetAuditScanResponse?> RecordScanAsync(
        int auditId,
        RecordAssetAuditScanRequest request,
        int scannedByUserId)
    {
        var audit = await _context.AssetAudits.FirstOrDefaultAsync(x => x.Id == auditId);

        if (audit == null)
            return null;

        if (audit.Status != "InProgress")
        {
            throw new InvalidOperationException(
                "This audit session is no longer in progress.");
        }

        var assetId = await ResolveAssetIdByCodeAsync(request.Code);

        if (assetId == null)
            return null;

        var existingItem = await _context.AssetAuditItems
            .Include(x => x.Asset)
            .FirstOrDefaultAsync(x =>
                x.AssetAuditId == auditId && x.AssetId == assetId.Value);

        bool wasDuplicate;

        if (existingItem != null && existingItem.IsScanned)
        {
            // Already recorded this session - report as a duplicate
            // without touching the stored result or the session's
            // counters. See AssetAuditItem for why "duplicate" is a
            // transient signal to the scanning user, not a persisted
            // ResultState value.
            wasDuplicate = true;
        }
        else if (existingItem != null)
        {
            // Was expected here and hasn't been scanned yet this
            // session - this is a genuine Found.
            wasDuplicate = false;

            existingItem.IsScanned = true;
            existingItem.ScannedAt = DateTime.UtcNow;
            existingItem.ScannedByUserId = scannedByUserId;
            existingItem.ResultState = "Found";

            audit.FoundCount += 1;
            audit.MissingCount = Math.Max(0, audit.MissingCount - 1);
        }
        else
        {
            // Wasn't in the expected snapshot at all - scanned but not
            // anticipated here. Distinguish "we know exactly where the
            // system expects it, and it isn't here" from "we have no
            // location on record for it" so a mis-shelved asset reads
            // differently from a genuinely unaccounted-for one.
            wasDuplicate = false;

            var resolvedLocationId = await ResolveAssetLocationIdAsync(assetId.Value);

            var resultState =
                resolvedLocationId.HasValue && resolvedLocationId.Value != audit.LocationId
                    ? "WrongLocation"
                    : "Unexpected";

            existingItem = new AssetAuditItem
            {
                AssetAuditId = auditId,
                AssetId = assetId.Value,
                IsExpected = false,
                IsScanned = true,
                ScannedAt = DateTime.UtcNow,
                ScannedByUserId = scannedByUserId,
                ResultState = resultState
            };

            _context.AssetAuditItems.Add(existingItem);
            audit.UnexpectedCount += 1;
        }

        await _context.SaveChangesAsync();

        var itemResponse = await MapItemAsync(existingItem);
        var auditResponse = await MapAuditAsync(audit);

        return new AssetAuditScanResponse
        {
            Item = itemResponse,
            WasDuplicate = wasDuplicate,
            Audit = auditResponse
        };
    }

    public async Task<AssetAuditDetailResponse?> CompleteAsync(
        int auditId,
        CompleteAssetAuditRequest request,
        int completedByUserId)
    {
        var audit = await _context.AssetAudits
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == auditId);

        if (audit == null)
            return null;

        if (audit.Status != "InProgress")
        {
            throw new InvalidOperationException(
                "This audit session has already been completed or cancelled.");
        }

        audit.Status = "Completed";
        audit.CompletedByUserId = completedByUserId;
        audit.CompletedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Remarks))
            audit.Remarks = request.Remarks;

        // Recompute from the items themselves rather than trusting the
        // running counters, so completion is correct even if counters
        // ever drifted (e.g. a future admin tool edits an item directly).
        audit.FoundCount = audit.Items.Count(x => x.ResultState == "Found");
        audit.MissingCount = audit.Items.Count(x => x.IsExpected && !x.IsScanned);
        audit.UnexpectedCount = audit.Items.Count(x =>
            x.ResultState == "Unexpected" || x.ResultState == "WrongLocation");

        await _context.SaveChangesAsync();

        return await GetAsync(auditId);
    }

    public async Task<AssetAuditDetailResponse?> GetAsync(int auditId)
    {
        var audit = await _context.AssetAudits
            .Include(x => x.Location)
            .Include(x => x.Department)
            .Include(x => x.StartedByUser)
            .Include(x => x.CompletedByUser)
            .FirstOrDefaultAsync(x => x.Id == auditId);

        if (audit == null)
            return null;

        var items = await _context.AssetAuditItems
            .Include(x => x.Asset)
            .Include(x => x.ScannedByUser)
            .Where(x => x.AssetAuditId == auditId)
            .OrderByDescending(x => x.ScannedAt)
            .ThenBy(x => x.Asset.AssetTag)
            .ToListAsync();

        return new AssetAuditDetailResponse
        {
            Audit = MapAudit(audit),
            Items = items.Select(MapItem).ToList()
        };
    }

    public async Task<List<AssetAuditResponse>> GetRecentAsync(
        string? status = null,
        int take = 20)
    {
        var query = _context.AssetAudits
            .Include(x => x.Location)
            .Include(x => x.Department)
            .Include(x => x.StartedByUser)
            .Include(x => x.CompletedByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.Status == status);

        var audits = await query
            .OrderByDescending(x => x.StartedAt)
            .Take(take)
            .ToListAsync();

        return audits.Select(MapAudit).ToList();
    }

    // -----------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------

    // Every active asset whose currently-known location resolves to
    // locationId: either Asset.CurrentLocationId (kept in sync by
    // MaterialMovementService - the source of truth once an asset has
    // ever moved through that module) or, when that's unset, the
    // office location of the seat behind its active Office assignment.
    // Assets with neither signal are simply not expected anywhere and
    // don't appear as Missing if they're never scanned.
    private async Task<List<int>> ResolveExpectedAssetIdsAsync(
        int locationId,
        int? departmentId)
    {
        var assets = _context.Assets.Where(a => a.IsActive);

        if (departmentId.HasValue)
            assets = assets.Where(a => a.DepartmentId == departmentId.Value);

        var directMatches = await assets
            .Where(a => a.CurrentLocationId == locationId)
            .Select(a => a.Id)
            .ToListAsync();

        var seatMatches = await assets
            .Where(a => a.CurrentLocationId == null)
            .Where(a => _context.AssetAssignments.Any(x =>
                x.AssetId == a.Id &&
                x.IsActive &&
                x.WorkMode == "Office" &&
                x.SeatId != null &&
                x.Seat!.OfficeFloor!.OfficeLocationId == locationId))
            .Select(a => a.Id)
            .ToListAsync();

        return directMatches.Concat(seatMatches).Distinct().ToList();
    }

    // Same signal preference as ResolveExpectedAssetIdsAsync, for a
    // single already-known asset id (used when classifying an
    // unexpected scan as Unexpected vs WrongLocation).
    private async Task<int?> ResolveAssetLocationIdAsync(int assetId)
    {
        var currentLocationId = await _context.Assets
            .Where(a => a.Id == assetId)
            .Select(a => a.CurrentLocationId)
            .FirstOrDefaultAsync();

        if (currentLocationId.HasValue)
            return currentLocationId;

        return await _context.AssetAssignments
            .Where(x =>
                x.AssetId == assetId &&
                x.IsActive &&
                x.WorkMode == "Office" &&
                x.SeatId != null)
            .Select(x => (int?)x.Seat!.OfficeFloor!.OfficeLocationId)
            .FirstOrDefaultAsync();
    }

    // Exact match only, mirroring AssetService.GetFullDetailByCodeAsync's
    // rule (AssetTag first, since it's uniquely indexed; SerialNumber
    // only if it resolves to exactly one active asset) - kept as a
    // separate small query here rather than a shared call because this
    // service only needs the id, not AssetService's aggregated detail
    // shape. If that matching rule ever changes, update both.
    private async Task<int?> ResolveAssetIdByCodeAsync(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;

        var normalized = code.Trim().ToLower();

        var byTag = await _context.Assets
            .Where(a => a.IsActive && a.AssetTag.ToLower() == normalized)
            .Select(a => (int?)a.Id)
            .FirstOrDefaultAsync();

        if (byTag != null)
            return byTag;

        var serialMatches = await _context.Assets
            .Where(a =>
                a.IsActive &&
                a.SerialNumber != null &&
                a.SerialNumber.ToLower() == normalized)
            .Select(a => a.Id)
            .ToListAsync();

        return serialMatches.Count == 1 ? serialMatches[0] : null;
    }

    private async Task<AssetAuditItemResponse> MapItemAsync(AssetAuditItem item)
    {
        if (item.Asset == null)
        {
            await _context.Entry(item).Reference(x => x.Asset).LoadAsync();
        }

        if (item.ScannedByUserId.HasValue && item.ScannedByUser == null)
        {
            await _context.Entry(item).Reference(x => x.ScannedByUser).LoadAsync();
        }

        return MapItem(item);
    }

    private static AssetAuditItemResponse MapItem(AssetAuditItem item) => new()
    {
        Id = item.Id,
        AssetId = item.AssetId,
        AssetTag = item.Asset?.AssetTag ?? string.Empty,
        AssetName = item.Asset?.AssetName ?? string.Empty,
        AssetType = item.Asset?.AssetType ?? string.Empty,
        IsExpected = item.IsExpected,
        IsScanned = item.IsScanned,
        ScannedAt = item.ScannedAt,
        ScannedByUserId = item.ScannedByUserId,
        ScannedByUserName = item.ScannedByUser?.FullName,
        ResultState = item.ResultState,
        Remarks = item.Remarks
    };

    private async Task<AssetAuditResponse> MapAuditAsync(AssetAudit audit)
    {
        if (audit.Location == null)
            await _context.Entry(audit).Reference(x => x.Location).LoadAsync();

        if (audit.DepartmentId.HasValue && audit.Department == null)
            await _context.Entry(audit).Reference(x => x.Department).LoadAsync();

        if (audit.StartedByUser == null)
            await _context.Entry(audit).Reference(x => x.StartedByUser).LoadAsync();

        if (audit.CompletedByUserId.HasValue && audit.CompletedByUser == null)
            await _context.Entry(audit).Reference(x => x.CompletedByUser).LoadAsync();

        return MapAudit(audit);
    }

    private static AssetAuditResponse MapAudit(AssetAudit audit) => new()
    {
        Id = audit.Id,
        LocationId = audit.LocationId,
        LocationName = audit.Location?.LocationName ?? string.Empty,
        DepartmentId = audit.DepartmentId,
        DepartmentName = audit.Department?.DepartmentName,
        StartedByUserId = audit.StartedByUserId,
        StartedByUserName = audit.StartedByUser?.FullName ?? string.Empty,
        StartedAt = audit.StartedAt,
        Status = audit.Status,
        CompletedByUserId = audit.CompletedByUserId,
        CompletedByUserName = audit.CompletedByUser?.FullName,
        CompletedAt = audit.CompletedAt,
        ExpectedCount = audit.ExpectedCount,
        FoundCount = audit.FoundCount,
        MissingCount = audit.MissingCount,
        UnexpectedCount = audit.UnexpectedCount,
        Remarks = audit.Remarks
    };
}
