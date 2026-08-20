using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.RoleModuleAccess;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class RoleModuleAccessService : IRoleModuleAccessService
{
    private readonly ApplicationDbContext _context;

    public RoleModuleAccessService(ApplicationDbContext context)
    {
        _context = context;
    }

    private static RoleModuleAccessResponse Map(RoleModuleAccess row)
    {
        return new RoleModuleAccessResponse
        {
            Id = row.Id,
            RoleName = row.RoleName,
            ModuleKey = row.ModuleKey,
            IsAllowed = row.IsAllowed,
            UpdatedAt = row.UpdatedAt,
            UpdatedByUserName = row.UpdatedByUser?.FullName
        };
    }

    public async Task<List<RoleModuleAccessResponse>> GetAllAsync()
    {
        var rows = await _context.RoleModuleAccess
            .Include(r => r.UpdatedByUser)
            .OrderBy(r => r.RoleName)
            .ThenBy(r => r.ModuleKey)
            .ToListAsync();

        return rows.Select(Map).ToList();
    }

    public async Task<RoleModuleAccessResponse> UpsertAsync(
        UpsertRoleModuleAccessRequest request, int actorUserId)
    {
        var roleName = request.RoleName.Trim();
        var moduleKey = request.ModuleKey.Trim();

        var row = await _context.RoleModuleAccess
            .FirstOrDefaultAsync(r =>
                r.RoleName == roleName && r.ModuleKey == moduleKey);

        if (row == null)
        {
            row = new RoleModuleAccess
            {
                RoleName = roleName,
                ModuleKey = moduleKey,
                IsAllowed = request.IsAllowed,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = actorUserId
            };

            _context.RoleModuleAccess.Add(row);
        }
        else
        {
            row.IsAllowed = request.IsAllowed;
            row.UpdatedAt = DateTime.UtcNow;
            row.UpdatedByUserId = actorUserId;
        }

        await _context.SaveChangesAsync();

        // Reload with the nav included so the response reflects the
        // current actor's name.
        await _context.Entry(row).Reference(r => r.UpdatedByUser).LoadAsync();

        return Map(row);
    }
}
