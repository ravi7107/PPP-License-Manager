using System.Security.Claims;

namespace PPS.LicenseManager.API.Common;

/*
 * Team Lead and Manager accounts see hardware Assets, License Purchases
 * and per-seat Licenses scoped to their own Entity (Company) only - each
 * PPS sub-entity (PTech, AEC, EC, ...) purchases its own assets/licenses
 * from its own budget, and a TL/Manager should only see their entity's.
 * Super Admin and IT Admin are never restricted here - they administer
 * the whole system across every entity.
 *
 * The "CompanyId" claim this reads is set by JwtService.GenerateToken
 * from the signed-in user's own User.CompanyId - it is never taken from
 * request input, so a restricted caller cannot widen their own scope by
 * passing a different company id anywhere.
 */
public static class EntityScopeHelper
{
    private static readonly string[] RestrictedRoles =
    {
        "Team Lead",
        "Manager",
    };

    public static (bool IsRestricted, int? CompanyId) Resolve(
        ClaimsPrincipal user)
    {
        var role = user.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;

        var isRestricted = RestrictedRoles.Contains(role);

        int? companyId = null;

        var companyIdClaim = user.FindFirst("CompanyId")?.Value;

        if (!string.IsNullOrEmpty(companyIdClaim) &&
            int.TryParse(companyIdClaim, out var parsed))
        {
            companyId = parsed;
        }

        return (isRestricted, companyId);
    }
}
