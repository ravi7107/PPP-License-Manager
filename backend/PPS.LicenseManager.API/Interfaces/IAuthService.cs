using PPS.LicenseManager.API.DTOs.Requests;
using PPS.LicenseManager.API.DTOs.Responses;

namespace PPS.LicenseManager.API.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);

    Task ChangeOwnPasswordAsync(int userId, ChangeOwnPasswordRequest request);
}
