namespace PPS.LicenseManager.API.DTOs.RoleModuleAccess;

public class RoleModuleAccessResponse
{
    public int Id { get; set; }

    public string RoleName { get; set; } = string.Empty;

    public string ModuleKey { get; set; } = string.Empty;

    public bool IsAllowed { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? UpdatedByUserName { get; set; }
}
