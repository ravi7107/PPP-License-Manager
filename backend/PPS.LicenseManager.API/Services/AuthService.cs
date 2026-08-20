using BCrypt.Net;
using PPS.LicenseManager.API.DTOs.Requests;
using PPS.LicenseManager.API.DTOs.Responses;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Interfaces.Repositories;

namespace PPS.LicenseManager.API.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtService _jwtService;

    public AuthService(
        IUserRepository userRepository,
        IJwtService jwtService)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        // Deliberately quiet on the happy/expected-failure paths - this
        // used to Console.WriteLine the attempted email, whether it
        // matched a user, the resolved role, IsActive, and a
        // password-verify boolean on every single login attempt (success
        // or failure), which is far more detail than a production log
        // should carry for an auth endpoint. Only genuine, unexpected
        // exceptions (bcrypt/JWT failures below) are still logged, since
        // those indicate a real bug rather than an ordinary bad password.
        var user = await _userRepository.GetByEmailAsync(request.Email);

        if (user == null)
        {
            throw new InvalidOperationException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new InvalidOperationException("User account is inactive.");
        }

        bool passwordValid;

        try
        {
            passwordValid = BCrypt.Net.BCrypt.Verify(
                request.Password,
                user.PasswordHash
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine("BCRYPT VERIFICATION FAILED");
            Console.WriteLine(ex.ToString());
            throw;
        }

        if (!passwordValid)
        {
            throw new InvalidOperationException(
                "Invalid email or password."
            );
        }

        string token;

        try
        {
            token = _jwtService.GenerateToken(user);
        }
        catch (Exception ex)
        {
            Console.WriteLine("JWT GENERATION FAILED");
            Console.WriteLine(ex.ToString());
            throw;
        }

        var response = new LoginResponse
        {
            UserId = user.Id,
            Token = token,
            Expiration = DateTime.UtcNow.AddMinutes(60),
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role?.Name ?? string.Empty,
            MustChangePassword = user.MustChangePassword,
            CompanyId = user.CompanyId,
            CompanyName = user.Company?.Name
        };

        return response;
    }

    public async Task ChangeOwnPasswordAsync(
        int userId,
        ChangeOwnPasswordRequest request)
    {
        var user = await _userRepository.GetByIdAsync(userId);

        if (user == null)
            throw new InvalidOperationException("User not found.");

        var currentPasswordValid = BCrypt.Net.BCrypt.Verify(
            request.CurrentPassword,
            user.PasswordHash);

        if (!currentPasswordValid)
        {
            throw new InvalidOperationException(
                "Current password is incorrect.");
        }

        user.PasswordHash =
            BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        user.MustChangePassword = false;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _userRepository.SaveChangesAsync();
    }
}
