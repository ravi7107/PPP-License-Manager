using PPS.LicenseManager.API.DTOs.RoleModuleAccess;

namespace PPS.LicenseManager.API.Interfaces;

public interface IRoleModuleAccessService
{
    // All rows, ordered by role then module - the frontend builds its
    // override map from the full set on every load rather than paging,
    // same as the dead UI-Bakery SQL action this replaces expected.
    Task<List<RoleModuleAccessResponse>> GetAllAsync();

    // Upsert semantics on (RoleName, ModuleKey) - matches the
    // "ON CONFLICT (role_name, module_key) DO UPDATE" the frontend's
    // original (never-wired) SQL action already expected, so newly added
    // modules/roles don't require a migration before they can be granted.
    // actorUserId is resolved server-side from the caller's JWT, not
    // client-supplied, so CreatedBy/UpdatedBy can't be spoofed.
    Task<RoleModuleAccessResponse> UpsertAsync(
        UpsertRoleModuleAccessRequest request, int actorUserId);
}
