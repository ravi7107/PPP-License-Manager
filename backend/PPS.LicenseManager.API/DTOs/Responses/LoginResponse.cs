namespace PPS.LicenseManager.API.DTOs.Responses;

public class LoginResponse
{
    public int UserId { get; set; }

    public string Token { get; set; } = string.Empty;

    public DateTime Expiration { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    // When true, the frontend must block access to everything else and
    // force this user through the change-password flow (POST
    // /api/Auth/change-password) before letting them proceed - see
    // User.MustChangePassword.
    public bool MustChangePassword { get; set; }

    // Null for users with no Entity assigned yet (e.g. system/admin
    // accounts) - the frontend uses this to show which entity a
    // Team Lead/Manager's data is scoped to.
    public int? CompanyId { get; set; }

    public string? CompanyName { get; set; }
}
