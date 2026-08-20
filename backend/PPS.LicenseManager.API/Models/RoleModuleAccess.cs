using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Drives which roles see which modules in the frontend navigation (see
 * frontend/lib/auth/roles.ts's canAccessModule/buildAccessOverride). A row
 * here overrides the hardcoded default in that file's MODULE_ACCESS map for
 * its (RoleName, ModuleKey) pair; when no row exists for a pair, the
 * default applies.
 *
 * Deliberately navigation-visibility only, NOT a backend authorization
 * source - the real API-level security boundary stays the
 * [Authorize(Roles=...)] attributes on each controller (see the access
 * management hardening work elsewhere this session). Granting a role a
 * module here without also granting it on the relevant controller just
 * shows a nav link that then 401s; revoking one here only hides the link -
 * a user who already has controller-level access can still reach the
 * route directly by URL. Keeping the two in sync is a manual admin
 * responsibility, same as when MODULE_ACCESS/[Authorize(Roles=...)] were
 * both hardcoded and had to be kept consistent by hand anyway.
 */
public class RoleModuleAccess
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string RoleName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string ModuleKey { get; set; } = string.Empty;

    public bool IsAllowed { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int CreatedByUserId { get; set; }

    public User? CreatedByUser { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByUserId { get; set; }

    public User? UpdatedByUser { get; set; }
}
