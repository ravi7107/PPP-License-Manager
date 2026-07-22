using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.DTOs.Requests;
using PPS.LicenseManager.API.DTOs.Responses;

namespace PPS.LicenseManager.API.Interfaces;

public interface IUserService
{
    Task<PagedResponse<UserResponse>> GetAllAsync(UserSearchRequest request);

    Task<UserResponse?> GetByIdAsync(int id);

    Task<UserResponse> CreateAsync(CreateUserRequest request);
    Task<UserResponse> UpdateAsync(int id, UpdateUserRequest request);
    Task ResetPasswordAsync(int id, ResetPasswordRequest request);
}
