using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.AssetAssignment;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;
using PPS.LicenseManager.API.Enums;

namespace PPS.LicenseManager.API.Services;

public class AssetAssignmentService : IAssetAssignmentService
{
    private readonly ApplicationDbContext _context;

    public AssetAssignmentService(
        ApplicationDbContext context)
    {
        _context = context;
    }


    // =========================================================
    // QUERY
    // =========================================================

    private IQueryable<AssetAssignment> AssignmentQuery()
    {
        return _context.AssetAssignments
            .AsNoTracking()
            .Include(x => x.Asset)
            .Include(x => x.User)
                .ThenInclude(x => x.Department)
            .Include(x => x.AssignedByUser);
    }


    private static AssetAssignmentResponse Map(
        AssetAssignment assignment)
    {
        return new AssetAssignmentResponse
        {
            Id = assignment.Id,

            AssetId = assignment.AssetId,
            AssetTag = assignment.Asset.AssetTag,
            AssetName = assignment.Asset.AssetName,
            HostName = assignment.Asset.HostName,

            UserId = assignment.UserId,
            UserName = assignment.User.FullName,
            EmployeeCode = assignment.User.EmployeeCode,

            DepartmentId =
                assignment.User.DepartmentId,

            DepartmentName =
                assignment.User.Department?.DepartmentName,

            AssignedByUserId =
                assignment.AssignedByUserId,

            AssignedByUserName =
                assignment.AssignedByUser.FullName,

            AssignedOn = assignment.AssignedOn,
            ReturnedOn = assignment.ReturnedOn,

            Status = assignment.Status,
            Remarks = assignment.Remarks,
            IsActive = assignment.IsActive
        };
    }


    public async Task<IEnumerable<AssetAssignmentResponse>>
        GetCurrentAsync()
    {
        var assignments = await AssignmentQuery()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Asset.AssetTag)
            .ToListAsync();

        return assignments.Select(Map);
    }


    public async Task<AssetAssignmentResponse?>
        GetByIdAsync(int id)
    {
        var assignment = await AssignmentQuery()
            .FirstOrDefaultAsync(x => x.Id == id);

        return assignment == null
            ? null
            : Map(assignment);
    }


    public async Task<IEnumerable<AssetAssignmentResponse>>
        GetHistoryByAssetIdAsync(int assetId)
    {
        var assignments = await AssignmentQuery()
            .Where(x => x.AssetId == assetId)
            .OrderByDescending(x => x.AssignedOn)
            .ToListAsync();

        return assignments.Select(Map);
    }


    public async Task<IEnumerable<AssetAssignmentResponse>>
        GetByUserIdAsync(int userId)
    {
        var assignments = await AssignmentQuery()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.AssignedOn)
            .ToListAsync();

        return assignments.Select(Map);
    }


    // =========================================================
    // ASSIGN
    // =========================================================

    public async Task<AssetAssignmentResponse> AssignAsync(
        AssignAssetRequest request,
        int assignedByUserId)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var asset = await _context.Assets
            .FirstOrDefaultAsync(
                x => x.Id == request.AssetId);

        if (asset == null)
            throw new InvalidOperationException(
                "Asset not found.");

        if (!asset.IsActive)
            throw new InvalidOperationException(
                "Inactive assets cannot be assigned.");

        if (!asset.IsReadyForAssignment ||
            !string.Equals(
                asset.Status,
                "Available",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Asset {asset.AssetTag} is not available for assignment.");
        }

var activeAssignment = await _context.AssetAssignments
    .FirstOrDefaultAsync(a =>
        a.AssetId == request.AssetId &&
        a.IsActive);

if (activeAssignment != null)
{
    throw new InvalidOperationException(
        "This asset is already assigned.");
}

if (request.AssignmentType == AssignmentType.Temporary &&
    request.ExpectedReturnDate == null)
{
    throw new InvalidOperationException(
        "Expected return date is required for temporary assignments.");
}

        var user = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Id == request.UserId);

        if (user == null)
            throw new InvalidOperationException(
                "User not found.");

        if (!user.IsActive)
            throw new InvalidOperationException(
                "Hardware cannot be assigned to an inactive user.");

        var assignedBy = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Id == assignedByUserId);

        if (assignedBy == null)
            throw new InvalidOperationException(
                "Assigned By user not found.");

        var alreadyAssigned =
            await _context.AssetAssignments
                .AnyAsync(x =>
                    x.AssetId == request.AssetId &&
                    x.IsActive);

        if (alreadyAssigned)
            throw new InvalidOperationException(
                "This asset already has an active assignment.");

        var now = DateTime.UtcNow;

        var assignment = new AssetAssignment
        {
            AssetId = request.AssetId,
            UserId = request.UserId,
            AssignedByUserId = assignedByUserId,

            AssignedOn = now,

            Status = "Assigned",
            Remarks = request.Remarks,
            IsActive = true,

            CreatedAt = now
        };

        _context.AssetAssignments.Add(assignment);

        asset.Status = "Assigned";
        asset.IsReadyForAssignment = false;
        asset.UpdatedAt = now;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return await GetByIdAsync(assignment.Id)
            ?? throw new InvalidOperationException(
                "Assignment was created but could not be retrieved.");
    }


    // =========================================================
    // TRANSFER
    // =========================================================

    public async Task<AssetAssignmentResponse?> TransferAsync(
        int id,
        TransferAssetRequest request,
        int transferredByUserId)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var current = await _context.AssetAssignments
            .Include(x => x.Asset)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (current == null)
            return null;

        if (!current.IsActive ||
            !string.Equals(
                current.Status,
                "Assigned",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Only an active hardware assignment can be transferred.");
        }

        if (current.UserId == request.NewUserId)
            throw new InvalidOperationException(
                "This asset is already assigned to the selected user.");

        var newUser = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Id == request.NewUserId);

        if (newUser == null)
            throw new InvalidOperationException(
                "Target user not found.");

        if (!newUser.IsActive)
            throw new InvalidOperationException(
                "Hardware cannot be transferred to an inactive user.");

        var transferredBy = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Id == transferredByUserId);

        if (transferredBy == null)
            throw new InvalidOperationException(
                "Transferred By user not found.");

        var now = DateTime.UtcNow;

        // Close old assignment permanently as history.
        current.IsActive = false;
        current.Status = "Transferred";
        current.ReturnedOn = now;
        current.UpdatedAt = now;

        if (!string.IsNullOrWhiteSpace(request.Remarks))
            current.Remarks = request.Remarks;

        /*
         * Save the closed assignment first.
         *
         * PostgreSQL has a partial unique index allowing only
         * one IsActive=true record for an AssetId.
         */
        await _context.SaveChangesAsync();

        var newAssignment = new AssetAssignment
        {
            AssetId = current.AssetId,
            UserId = request.NewUserId,
            AssignedByUserId = transferredByUserId,

            AssignedOn = now,

            Status = "Assigned",
            Remarks = request.Remarks,
            IsActive = true,

            CreatedAt = now
        };

        _context.AssetAssignments.Add(newAssignment);

        // Asset remains assigned during transfer.
        current.Asset.Status = "Assigned";
        current.Asset.IsReadyForAssignment = false;
        current.Asset.UpdatedAt = now;

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetByIdAsync(newAssignment.Id);
    }


    // =========================================================
    // RETURN
    // =========================================================

    public async Task<bool> ReturnAsync(
        int id,
        ReturnAssetRequest request)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var assignment = await _context.AssetAssignments
            .Include(x => x.Asset)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (assignment == null)
            return false;

        if (!assignment.IsActive)
            throw new InvalidOperationException(
                "Hardware assignment is already closed.");

        var now = DateTime.UtcNow;

        assignment.IsActive = false;
        assignment.Status = "Returned";
        assignment.ReturnedOn = now;
        assignment.UpdatedAt = now;

        if (!string.IsNullOrWhiteSpace(request.Remarks))
            assignment.Remarks = request.Remarks;

        assignment.Asset.Status = "Available";
        assignment.Asset.IsReadyForAssignment = true;
        assignment.Asset.UpdatedAt = now;

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return true;
    }
}
