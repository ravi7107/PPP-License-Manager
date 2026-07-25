using PPS.LicenseManager.API.Common;
using BCrypt.Net;
using PPS.LicenseManager.API.DTOs.Requests;
using PPS.LicenseManager.API.DTOs.Responses;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Interfaces.Repositories;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<PagedResponse<UserResponse>> GetAllAsync(UserSearchRequest request)
{
    var result = await _userRepository.SearchAsync(
        request.Search,
        request.Page,
        request.PageSize);

    return new PagedResponse<UserResponse>
    {
        Items = result.Users.Select(u => new UserResponse
        {
            Id = u.Id,
            FullName = u.FullName,
            EmployeeCode = u.EmployeeCode,
            Email = u.Email,
            Role = u.Role?.Name ?? string.Empty,
            IsActive = u.IsActive,
            CreatedAt = u.CreatedAt
        }).ToList(),

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

        return new UserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            EmployeeCode = user.EmployeeCode,
            Email = user.Email,
            Role = user.Role?.Name ?? string.Empty,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<UserResponse> CreateAsync(CreateUserRequest request)
    {
        // Check duplicate email
        if (await _userRepository.GetByEmailAsync(request.Email) != null)
            throw new InvalidOperationException("Email already exists.");

        // Check duplicate employee code
        if (await _userRepository.GetByEmployeeCodeAsync(request.EmployeeCode) != null)
            throw new InvalidOperationException("Employee Code already exists.");

        var user = new User
        {
            FullName = request.FullName,
            EmployeeCode = request.EmployeeCode,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = request.RoleId,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        // Reload user with Role
        user = await _userRepository.GetByIdAsync(user.Id) ?? user;

        return new UserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            EmployeeCode = user.EmployeeCode,
            Email = user.Email,
            Role = user.Role?.Name ?? string.Empty,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
public async Task<UserResponse> UpdateAsync(int id, UpdateUserRequest request)
{
    var user = await _userRepository.GetByIdAsync(id);

    if (user == null)
        throw new InvalidOperationException("User not found.");

    // Check duplicate email
    var existingEmail = await _userRepository.GetByEmailAsync(request.Email);
    if (existingEmail != null && existingEmail.Id != id)
        throw new InvalidOperationException("Email already exists.");

    // Check duplicate employee code
    var existingEmployee = await _userRepository.GetByEmployeeCodeAsync(request.EmployeeCode);
    if (existingEmployee != null && existingEmployee.Id != id)
        throw new InvalidOperationException("Employee Code already exists.");

    user.FullName = request.FullName;
    user.EmployeeCode = request.EmployeeCode;
    user.Email = request.Email;
    user.RoleId = request.RoleId;
    user.IsActive = request.IsActive;

    await _userRepository.UpdateAsync(user);
    await _userRepository.SaveChangesAsync();

    user = await _userRepository.GetByIdAsync(id) ?? user;

    return new UserResponse
    {
        Id = user.Id,
        FullName = user.FullName,
        EmployeeCode = user.EmployeeCode,
        Email = user.Email,
        Role = user.Role?.Name ?? string.Empty,
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt
    };
}

public async Task ResetPasswordAsync(int id, ResetPasswordRequest request)
{
    var user = await _userRepository.GetByIdAsync(id);

    if (user == null)
    {
        throw new KeyNotFoundException("User not found.");
    }

    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

    await _userRepository.UpdateAsync(user);
    await _userRepository.SaveChangesAsync();
}
}

