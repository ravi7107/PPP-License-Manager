using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.DTOs.Requests;
using PPS.LicenseManager.API.DTOs.Responses;

namespace PPS.LicenseManager.API.Interfaces;

public interface IUserService
{
    Task<PagedResponse<UserResponse>> GetAllAsync(UserSearchRequest request);

    Task<UserResponse?> GetByIdAsync(int id);

    // callerIsSuperAdmin distinguishes a Super Admin caller from an IT
    // Admin caller - both roles pass the controller's [Authorize(Roles=
    // "Super Admin,IT Admin")] gate, but only a Super Admin may grant the
    // Super Admin role to someone else or modify/reset the password of an
    // existing Super Admin account. callerUserId is used separately to
    // block a caller from changing their own role (self-escalation).
    Task<UserResponse> CreateAsync(
        CreateUserRequest request, bool callerIsSuperAdmin);

    Task<UserResponse> UpdateAsync(
        int id, UpdateUserRequest request, int callerUserId, bool callerIsSuperAdmin);

    Task ResetPasswordAsync(
        int id, ResetPasswordRequest request, int callerUserId, bool callerIsSuperAdmin);
}
