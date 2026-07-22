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

        if (user != null)
        {
            Console.WriteLine($"DB Email: {user.Email}");
            Console.WriteLine($"Stored Hash: {user.PasswordHash}");

            bool verify = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            Console.WriteLine($"Password Verify: {verify}");
        }

        if (user == null)
            throw new InvalidOperationException("Invalid email or password.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new InvalidOperationException("Invalid email or password.");

        var token = _jwtService.GenerateToken(user);

        return new LoginResponse
        {
            Token = token,
            Expiration = DateTime.UtcNow.AddMinutes(60),
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role?.Name ?? string.Empty
        };
    }
}
