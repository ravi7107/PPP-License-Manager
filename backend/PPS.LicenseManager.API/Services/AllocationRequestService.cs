using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.AllocationRequest;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class AllocationRequestService : IAllocationRequestService
{
    private readonly ApplicationDbContext _context;

    public AllocationRequestService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AllocationRequestResponse>> GetAllAsync()
{
    return await _context.AllocationRequests
        .Include(x => x.Software)
        .Include(x => x.RequestedByUser)
        .Include(x => x.Asset)
        .OrderByDescending(x => x.CreatedAt)
        .Select(x => new AllocationRequestResponse
        {
            Id = x.Id,
            RequestReference = x.RequestReference,

            SoftwareId = x.SoftwareId,
            SoftwareName = x.Software.Name,

            RequestedByUserId = x.RequestedByUserId,
            RequestedByUserName = x.RequestedByUser.FullName,

            AssetId = x.AssetId,
            AssetName = x.Asset != null ? x.Asset.AssetName : null,

            BusinessJustification = x.BusinessJustification,
            RequiredFrom = x.RequiredFrom,
            RequiredTill = x.RequiredTill,

            Priority = x.Priority,
            Status = x.Status,
            Remarks = x.Remarks,
            CreatedAt = x.CreatedAt
        })
        .ToListAsync();
}

    public async Task<AllocationRequestResponse?> GetByIdAsync(int id)
{
    return await _context.AllocationRequests
        .Include(x => x.Software)
        .Include(x => x.RequestedByUser)
        .Include(x => x.Asset)
        .Where(x => x.Id == id)
        .Select(x => new AllocationRequestResponse
        {
            Id = x.Id,
            RequestReference = x.RequestReference,

            SoftwareId = x.SoftwareId,
            SoftwareName = x.Software.Name,

            RequestedByUserId = x.RequestedByUserId,
            RequestedByUserName = x.RequestedByUser.FullName,

            AssetId = x.AssetId,
            AssetName = x.Asset != null ? x.Asset.AssetName : null,

            BusinessJustification = x.BusinessJustification,
            RequiredFrom = x.RequiredFrom,
            RequiredTill = x.RequiredTill,

            Priority = x.Priority,
            Status = x.Status,
            Remarks = x.Remarks,
            CreatedAt = x.CreatedAt
        })
        .FirstOrDefaultAsync();
}

public async Task<AllocationRequestResponse> CreateAsync(CreateAllocationRequestRequest request)
{
    var software = await _context.Software.FindAsync(request.SoftwareId);

    if (software == null)
        throw new Exception("Software not found.");

    var user = await _context.Users.FindAsync(request.RequestedByUserId);

    if (user == null)
        throw new Exception("Requested user not found.");

    Asset? asset = null;

    if (request.AssetId.HasValue)
    {
        asset = await _context.Assets.FindAsync(request.AssetId.Value);

        if (asset == null)
            throw new Exception("Asset not found.");
    }

    var allocationRequest = new AllocationRequest
    {
        SoftwareId = request.SoftwareId,
        RequestedByUserId = request.RequestedByUserId,
        AssetId = request.AssetId,
        BusinessJustification = request.BusinessJustification,
        RequiredFrom = request.RequiredFrom,
        RequiredTill = request.RequiredTill,
        Priority = request.Priority,
        Remarks = request.Remarks,
        Status = "Pending"
    };

    _context.AllocationRequests.Add(allocationRequest);

    await _context.SaveChangesAsync();

    return new AllocationRequestResponse
    {
        Id = allocationRequest.Id,
        RequestReference = allocationRequest.RequestReference,

        SoftwareId = software.Id,
        SoftwareName = software.Name,

        RequestedByUserId = user.Id,
        RequestedByUserName = user.FullName,

        AssetId = asset?.Id,
        AssetName = asset?.AssetName,

        BusinessJustification = allocationRequest.BusinessJustification,
        RequiredFrom = allocationRequest.RequiredFrom,
        RequiredTill = allocationRequest.RequiredTill,

        Priority = allocationRequest.Priority,
        Status = allocationRequest.Status,
        Remarks = allocationRequest.Remarks,
        CreatedAt = allocationRequest.CreatedAt
    };
}

    public async Task<AllocationRequestResponse?> UpdateAsync(int id, UpdateAllocationRequestRequest request)
    {
        throw new NotImplementedException();
    }

    public async Task<bool> DeleteAsync(int id)
    {
        throw new NotImplementedException();
    }
public async Task<AllocationRequestResponse?> ApproveAsync(
    int id,
    ApproveAllocationRequestRequest request)
{
    var allocationRequest = await _context.AllocationRequests
        .Include(x => x.Software)
        .Include(x => x.RequestedByUser)
        .Include(x => x.Asset)
        .FirstOrDefaultAsync(x => x.Id == id);

    if (allocationRequest == null)
        return null;

    if (allocationRequest.Status != "Pending")
        throw new Exception("Only pending requests can be approved.");

    allocationRequest.Status = "Approved";
    allocationRequest.ApprovedByUserId = request.ApprovedByUserId;
    allocationRequest.ApprovedAt = DateTime.UtcNow;

    await _context.SaveChangesAsync();

    return await GetByIdAsync(id);
}

public async Task<AllocationRequestResponse?> RejectAsync(
    int id,
    RejectAllocationRequestRequest request)
{
    var allocationRequest = await _context.AllocationRequests
        .FirstOrDefaultAsync(x => x.Id == id);

    if (allocationRequest == null)
        return null;

    if (allocationRequest.Status != "Pending")
        throw new Exception("Only pending requests can be rejected.");

    allocationRequest.Status = "Rejected";
    allocationRequest.ApprovedByUserId = request.ApprovedByUserId;
    allocationRequest.ApprovedAt = DateTime.UtcNow;
    allocationRequest.RejectionReason = request.Reason;

    await _context.SaveChangesAsync();

    return await GetByIdAsync(id);
}
}
