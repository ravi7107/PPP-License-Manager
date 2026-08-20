using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.RoleModuleAccess;

public class UpsertRoleModuleAccessRequest
{
    [Required]
    [MaxLength(50)]
    public string RoleName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string ModuleKey { get; set; } = string.Empty;

    public bool IsAllowed { get; set; }
}
