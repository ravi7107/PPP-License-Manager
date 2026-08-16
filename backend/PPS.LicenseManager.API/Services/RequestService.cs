using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Request;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class RequestService : IRequestService
{
    private readonly ApplicationDbContext _context;

    public RequestService(ApplicationDbContext context)
    {
        _context = context;
    }

    private static readonly string[] ValidRequestTypes =
    {
        "New License",
        "Reallocation",
        "Release",
        "Temporary License Allocation",
        "Hardware Allocation",
        "Hardware Transfer",
        "Return Hardware",
    };

    private static readonly string[] ValidAllocationTypes =
    {
        "User", "Computer", "Entity", "Client",
    };

    private IQueryable<Request> QueryWithIncludes()
    {
        return _context.Requests
            .Include(x => x.Requester)
            .Include(x => x.Department)
            .Include(x => x.Software)
            .Include(x => x.Asset)
            .Include(x => x.Company)
            .Include(x => x.Client)
            .Include(x => x.TargetUser);
    }

    private static RequestResponse ToResponse(Request x)
    {
        return new RequestResponse
        {
            Id = x.Id,
            RequestType = x.RequestType,

            RequesterId = x.RequesterId,
            RequesterName = x.Requester?.FullName ?? string.Empty,

            DepartmentId = x.DepartmentId,
            DepartmentName = x.Department?.DepartmentName,

            SoftwareId = x.SoftwareId,
            SoftwareName = x.Software?.Name,

            AllocationType = x.AllocationType,

            AssetId = x.AssetId,
            AssetName = x.Asset?.AssetName,

            CompanyId = x.CompanyId,
            CompanyName = x.Company?.Name,

            ClientId = x.ClientId,
            ClientName = x.Client?.Name,

            TargetUserId = x.TargetUserId,
            TargetUserName = x.TargetUser?.FullName,

            Justification = x.Justification,
            RequestedDate = x.RequestedDate,
            DurationDays = x.DurationDays,
            Status = x.Status,
            Priority = x.Priority,
            RequiredFromDate = x.RequiredFromDate,
            RequiredUntilDate = x.RequiredUntilDate,
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt,
        };
    }

    public async Task<IEnumerable<RequestResponse>> GetAllAsync(int? requesterId, string? status)
    {
        var query = QueryWithIncludes();

        if (requesterId.HasValue)
            query = query.Where(x => x.RequesterId == requesterId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.Status == status);

        var entities = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return entities.Select(ToResponse);
    }

    public async Task<RequestResponse?> GetByIdAsync(int id)
    {
        var request = await QueryWithIncludes().FirstOrDefaultAsync(x => x.Id == id);

        return request == null ? null : ToResponse(request);
    }

    public async Task<RequestResponse> CreateAsync(CreateRequestRequest request)
    {
        if (!ValidRequestTypes.Contains(request.RequestType))
            throw new ArgumentException($"Unknown request type '{request.RequestType}'.");

        if (!ValidAllocationTypes.Contains(request.AllocationType))
            throw new ArgumentException($"Unknown allocation type '{request.AllocationType}'.");

        var requester = await _context.Users.FindAsync(request.RequesterId);

        if (requester == null)
            throw new ArgumentException("Requester not found.");

        if (request.DepartmentId.HasValue &&
            !await _context.Departments.AnyAsync(d => d.Id == request.DepartmentId.Value))
            throw new ArgumentException("Department not found.");

        if (request.SoftwareId.HasValue &&
            !await _context.Software.AnyAsync(s => s.Id == request.SoftwareId.Value))
            throw new ArgumentException("Software not found.");

        if (request.AssetId.HasValue &&
            !await _context.Assets.AnyAsync(a => a.Id == request.AssetId.Value))
            throw new ArgumentException("Asset not found.");

        if (request.CompanyId.HasValue &&
            !await _context.Companies.AnyAsync(c => c.Id == request.CompanyId.Value))
            throw new ArgumentException("Entity not found.");

        if (request.ClientId.HasValue &&
            !await _context.Clients.AnyAsync(c => c.Id == request.ClientId.Value))
            throw new ArgumentException("Client not found.");

        if (request.TargetUserId.HasValue &&
            !await _context.Users.AnyAsync(u => u.Id == request.TargetUserId.Value))
            throw new ArgumentException("Target user not found.");

        var entity = new Request
        {
            RequestType = request.RequestType,
            RequesterId = request.RequesterId,
            DepartmentId = request.DepartmentId,
            SoftwareId = request.SoftwareId,
            AllocationType = request.AllocationType,
            AssetId = request.AssetId,
            CompanyId = request.CompanyId,
            ClientId = request.ClientId,
            TargetUserId = request.TargetUserId,
            Justification = request.Justification,
            RequestedDate = request.RequestedDate ?? DateTime.UtcNow.Date,
            DurationDays = request.DurationDays,
            Priority = string.IsNullOrWhiteSpace(request.Priority) ? "Medium" : request.Priority,
            RequiredFromDate = request.RequiredFromDate,
            RequiredUntilDate = request.RequiredUntilDate,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
        };

        _context.Requests.Add(entity);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(entity.Id))!;
    }

    public async Task<RequestResponse?> CancelAsync(int id, int actorUserId)
    {
        var entity = await _context.Requests.FirstOrDefaultAsync(x => x.Id == id);

        if (entity == null)
            return null;

        if (entity.Status != "Pending")
            throw new InvalidOperationException("Only pending requests can be cancelled.");

        entity.Status = "Cancelled";
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    private async Task<RequestResponse?> DecideAsync(int id, DecideRequestRequest request, string decision)
    {
        var entity = await _context.Requests.FirstOrDefaultAsync(x => x.Id == id);

        if (entity == null)
            return null;

        if (entity.Status != "Pending")
            throw new InvalidOperationException("Only pending requests can be decided.");

        var approver = await _context.Users.FindAsync(request.ActorUserId);

        entity.Status = decision;
        entity.UpdatedAt = DateTime.UtcNow;

        _context.RequestApprovals.Add(new RequestApproval
        {
            RequestId = entity.Id,
            ApproverUserId = approver?.Id,
            ApproverName = approver?.FullName ?? "Unknown",
            Decision = decision,
            Comment = request.Comment,
            DecidedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public Task<RequestResponse?> ApproveAsync(int id, DecideRequestRequest request) =>
        DecideAsync(id, request, "Approved");

    public Task<RequestResponse?> RejectAsync(int id, DecideRequestRequest request) =>
        DecideAsync(id, request, "Rejected");

    public async Task<IEnumerable<RequestApprovalResponse>> GetApprovalHistoryAsync(int requestId)
    {
        return await _context.RequestApprovals
            .Where(x => x.RequestId == requestId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new RequestApprovalResponse
            {
                Id = x.Id,
                RequestId = x.RequestId,
                ApproverName = x.ApproverName,
                Decision = x.Decision,
                Comment = x.Comment,
                DecidedAt = x.DecidedAt,
                CreatedAt = x.CreatedAt,
            })
            .ToListAsync();
    }
}
