namespace PPS.LicenseManager.API.DTOs.Responses;

public class LoginResponse
{
    public int UserId { get; set; }

    public string Token { get; set; } = string.Empty;

    public DateTime Expiration { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    // Null for users with no Entity assigned yet (e.g. system/admin
    // accounts) - the frontend uses this to show which entity a
    // Team Lead/Manager's data is scoped to.
    public int? CompanyId { get; set; }

    public string? CompanyName { get; set; }
}
