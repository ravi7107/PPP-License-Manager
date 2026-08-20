import { getRoleModuleAccess } from '@/lib/api/role-module-access.api';
import { RoleModuleAccessRow } from '@/lib/auth/roles';

// Previously leftover UI-Bakery-migration scaffolding that returned a raw
// SQL query descriptor and never actually called anything (see the
// Array.isArray guard in roles.ts's buildAccessOverride, and the "not
// connected" placeholder this used to force in access-management-page.tsx).
// Now a real call against the ASP.NET backend's RoleModuleAccessController.
async function loadRoleModuleAccess(): Promise<RoleModuleAccessRow[]> {
  const rows = await getRoleModuleAccess();

  return rows.map((row) => ({
    roleName: row.roleName,
    moduleKey: row.moduleKey,
    isAllowed: row.isAllowed,
  }));
}

export default loadRoleModuleAccess;
