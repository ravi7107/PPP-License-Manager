import { upsertRoleModuleAccess as upsertRoleModuleAccessApi } from '@/lib/api/role-module-access.api';

// Previously leftover UI-Bakery-migration scaffolding that returned a raw
// SQL query descriptor and never actually called anything - see
// loadRoleModuleAccess.ts. actorName is no longer accepted as a parameter:
// the backend derives the acting user from the authenticated JWT
// (RoleModuleAccessController.GetCurrentUserId), so it can't be spoofed by
// whatever the caller happens to pass here.
async function upsertRoleModuleAccess(params: {
  roleName: string;
  moduleKey: string;
  isAllowed: boolean;
}) {
  return upsertRoleModuleAccessApi({
    roleName: params.roleName,
    moduleKey: params.moduleKey,
    isAllowed: params.isAllowed,
  });
}

export default upsertRoleModuleAccess;
