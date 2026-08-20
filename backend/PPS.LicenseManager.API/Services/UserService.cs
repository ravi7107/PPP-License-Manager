using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Requests;
using PPS.LicenseManager.API.DTOs.Responses;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Interfaces.Repositories;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly ApplicationDbContext _context;

    public UserService(
        IUserRepository userRepository,
        ApplicationDbContext context)
    {
        _userRepository = userRepository;
        _context = context;
    }

    public async Task<PagedResponse<UserResponse>> GetAllAsync(
        UserSearchRequest request)
    {
        var result = await _userRepository.SearchAsync(
            request.Search,
            request.Page,
            request.PageSize);

        return new PagedResponse<UserResponse>
        {
            Items = result.Users
                .Select(MapUser)
                .ToList(),

            Page = request.Page,
            PageSize = request.PageSize,
            TotalRecords = result.TotalRecords
        };
    }

    public async Task<UserResponse?> GetByIdAsync(int id)
    {
        var user = await _userRepository.GetByIdAsync(id);

        if (user == null)
            return null;

        return MapUser(user);
    }

    public async Task<UserResponse> CreateAsync(
        CreateUserRequest request, bool callerIsSuperAdmin)
    {
        if (await _userRepository.GetByEmailAsync(
                request.Email.Trim()) != null)
        {
            throw new InvalidOperationException(
                "Email already exists.");
        }

        if (await _userRepository.GetByEmployeeCodeAsync(
                request.EmployeeCode.Trim()) != null)
        {
            throw new InvalidOperationException(
                "Employee Code already exists.");
        }

        await ValidateOrganizationAsync(
            request.CompanyId,
            request.DepartmentId);

        await ValidateRoleAsync(request.RoleId);

        // Only a Super Admin may grant the Super Admin role. Without this,
        // an IT Admin (who also passes the controller's role gate) could
        // create a brand-new Super Admin account for themselves or anyone
        // else - a straightforward privilege-escalation path.
        if (!callerIsSuperAdmin &&
            await IsSuperAdminRoleAsync(request.RoleId))
        {
            throw new UnauthorizedAccessException(
                "Only a Super Admin can assign the Super Admin role.");
        }

        await ValidateReportsToUserAsync(
            request.ReportsToUserId);

        var user = new User
        {
            FullName = request.FullName.Trim(),
            EmployeeCode = request.EmployeeCode.Trim(),
            Email = request.Email.Trim(),
            PasswordHash =
                BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = request.RoleId,
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            ReportsToUserId = request.ReportsToUserId,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        user = await _userRepository.GetByIdAsync(user.Id)
            ?? user;

        return MapUser(user);
    }

    public async Task<UserResponse> UpdateAsync(
        int id,
        UpdateUserRequest request,
        int callerUserId,
        bool callerIsSuperAdmin)
    {
        var user = await _userRepository.GetByIdAsync(id);

        if (user == null)
            throw new InvalidOperationException(
                "User not found.");

        // A caller can never change their own role, regardless of
        // privilege level - otherwise a Super Admin/IT Admin editing their
        // own account through this same endpoint could hand themselves a
        // higher role than they were actually granted. Every other field
        // on a caller's own account remains editable here.
        if (id == callerUserId && request.RoleId != user.RoleId)
        {
            throw new InvalidOperationException(
                "You cannot change your own role.");
        }

        var targetIsCurrentlySuperAdmin = string.Equals(
            user.Role?.Name,
            "Super Admin",
            StringComparison.OrdinalIgnoreCase);

        if (!callerIsSuperAdmin)
        {
            // Only a Super Admin may modify another Super Admin's
            // account at all - an IT Admin could otherwise strip a Super
            // Admin's role, deactivate the account, or move it to a
            // different entity/department.
            if (targetIsCurrentlySuperAdmin)
            {
                throw new UnauthorizedAccessException(
                    "Only a Super Admin can modify another Super Admin's account.");
            }

            // ...and only a Super Admin may promote anyone into the role.
            if (await IsSuperAdminRoleAsync(request.RoleId))
            {
                throw new UnauthorizedAccessException(
                    "Only a Super Admin can assign the Super Admin role.");
            }
        }

        var email = request.Email.Trim();
        var employeeCode = request.EmployeeCode.Trim();

        var existingEmail =
            await _userRepository.GetByEmailAsync(email);

        if (existingEmail != null &&
            existingEmail.Id != id)
        {
            throw new InvalidOperationException(
                "Email already exists.");
        }

        var existingEmployee =
            await _userRepository.GetByEmployeeCodeAsync(
                employeeCode);

        if (existingEmployee != null &&
            existingEmployee.Id != id)
        {
            throw new InvalidOperationException(
                "Employee Code already exists.");
        }

        await ValidateOrganizationAsync(
            request.CompanyId,
            request.DepartmentId);

        await ValidateRoleAsync(request.RoleId);

        await ValidateReportsToUserAsync(
            request.ReportsToUserId,
            id);

        user.FullName = request.FullName.Trim();
        user.EmployeeCode = employeeCode;
        user.Email = email;
        user.RoleId = request.RoleId;
        user.CompanyId = request.CompanyId;
        user.DepartmentId = request.DepartmentId;
        user.ReportsToUserId = request.ReportsToUserId;
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _userRepository.SaveChangesAsync();

        user = await _userRepository.GetByIdAsync(id)
            ?? user;

        return MapUser(user);
    }

    public async Task ResetPasswordAsync(
        int id,
        ResetPasswordRequest request,
        int callerUserId,
        bool callerIsSuperAdmin)
    {
        var user = await _userRepository.GetByIdAsync(id);

        if (user == null)
            throw new KeyNotFoundException(
                "User not found.");

        // Resetting your own password is fine (no escalation risk); the
        // restriction is specifically about an IT Admin resetting a
        // *different* Super Admin's password, which would let them lock
        // out or take over that account.
        if (id != callerUserId &&
            !callerIsSuperAdmin &&
            string.Equals(
                user.Role?.Name,
                "Super Admin",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException(
                "Only a Super Admin can reset another Super Admin's password.");
        }

        user.PasswordHash =
            BCrypt.Net.BCrypt.HashPassword(
                request.NewPassword);

        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _userRepository.SaveChangesAsync();
    }

    private async Task ValidateOrganizationAsync(
        int? companyId,
        int? departmentId)
    {
        // Existing system/admin accounts are allowed
        // to remain without organizational assignment.
        if (companyId == null && departmentId == null)
            return;

        // Prevent partial assignment.
        if (companyId == null || departmentId == null)
        {
            throw new InvalidOperationException(
                "Both entity and department must be selected.");
        }

        var companyExists = await _context.Companies
            .AsNoTracking()
            .AnyAsync(c =>
                c.Id == companyId.Value &&
                c.IsActive);

        if (!companyExists)
        {
            throw new InvalidOperationException(
                "Selected entity does not exist or is inactive.");
        }

        var department = await _context.Departments
            .AsNoTracking()
            .FirstOrDefaultAsync(d =>
                d.Id == departmentId.Value);

        if (department == null)
        {
            throw new InvalidOperationException(
                "Selected department does not exist.");
        }

        if (!department.IsActive)
        {
            throw new InvalidOperationException(
                "Selected department is inactive.");
        }

        if (department.CompanyId != companyId.Value)
        {
            throw new InvalidOperationException(
                "Selected department does not belong to the selected entity.");
        }
    }

    private async Task ValidateReportsToUserAsync(
        int? reportsToUserId,
        int? currentUserId = null)
    {
        // Reporting assignment is optional.
        if (reportsToUserId == null)
            return;

        // Prevent a user from reporting to themselves.
        if (currentUserId.HasValue &&
            reportsToUserId.Value == currentUserId.Value)
        {
            throw new InvalidOperationException(
                "A user cannot report to themselves.");
        }

        var reportingUser =
            await _context.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u =>
                    u.Id == reportsToUserId.Value);

        if (reportingUser == null)
        {
            throw new InvalidOperationException(
                "Selected reporting user does not exist.");
        }

        if (!reportingUser.IsActive)
        {
            throw new InvalidOperationException(
                "Selected reporting user is inactive.");
        }

        var reportingRole =
            reportingUser.Role?.Name;

        if (!string.Equals(
                reportingRole,
                "Team Lead",
                StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(
                reportingRole,
                "Manager",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Selected reporting user must be a Team Lead or Manager.");
        }
    }

    private async Task ValidateRoleAsync(int roleId)
    {
        var roleExists = await _context.Roles
            .AsNoTracking()
            .AnyAsync(r =>
                r.Id == roleId &&
                r.IsActive);

        if (!roleExists)
        {
            throw new InvalidOperationException(
                "Selected role does not exist or is inactive.");
        }
    }

    private async Task<bool> IsSuperAdminRoleAsync(int roleId)
    {
        return await _context.Roles
            .AsNoTracking()
            .AnyAsync(r =>
                r.Id == roleId &&
                r.Name == "Super Admin");
    }

    private static UserResponse MapUser(User user)
    {
        return new UserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            EmployeeCode = user.EmployeeCode,
            Email = user.Email,
            Role = user.Role?.Name ?? string.Empty,

            CompanyId = user.CompanyId,
            CompanyName = user.Company?.Name,

            DepartmentId = user.DepartmentId,
            DepartmentName =
                user.Department?.DepartmentName,

            ReportsToUserId =
                user.ReportsToUserId,

            ReportsToUserName =
                user.ReportsToUser?.FullName,

            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}
