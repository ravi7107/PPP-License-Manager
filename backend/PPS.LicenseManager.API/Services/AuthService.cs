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
        Console.WriteLine($"Login attempt: {request.Email}");

        var user = await _userRepository.GetByEmailAsync(request.Email);

        Console.WriteLine($"User Found: {user != null}");

        if (user == null)
        {
            Console.WriteLine("Login failed: user not found.");
            throw new InvalidOperationException("Invalid email or password.");
        }

        Console.WriteLine($"DB Email: {user.Email}");
        Console.WriteLine($"Role: {user.Role?.Name ?? "NULL"}");
        Console.WriteLine($"Is Active: {user.IsActive}");

        if (!user.IsActive)
        {
            Console.WriteLine("Login failed: account inactive.");
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

        Console.WriteLine($"Password Verify: {passwordValid}");

        if (!passwordValid)
        {
            throw new InvalidOperationException(
                "Invalid email or password."
            );
        }

        Console.WriteLine("Generating JWT...");

        string token;

        try
        {
            token = _jwtService.GenerateToken(user);
            Console.WriteLine("JWT generated successfully.");
        }
        catch (Exception ex)
        {
            Console.WriteLine("JWT GENERATION FAILED");
            Console.WriteLine(ex.ToString());
            throw;
        }

        Console.WriteLine("Building login response...");

        var response = new LoginResponse
        {
            Token = token,
            Expiration = DateTime.UtcNow.AddMinutes(60),
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role?.Name ?? string.Empty
        };

        Console.WriteLine(
            $"Login successful: {user.Email} / {response.Role}"
        );

        return response;
    }
}
