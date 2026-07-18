// Custom role names as configured in UI Bakery workspace (Users & Permissions).
export type AppRole = 'Super Administrator' | 'IT Administrator' | 'Team Leader' | 'Management';

export type ModuleKey =
  | 'dashboard'
  | 'hardware'
  | 'licenses'
  | 'allocations'
  | 'availability'
  | 'approvals'
  | 'reports'
  | 'myRequests'
  | 'search'
  | 'executive'
  | 'users'
  | 'departments'
  | 'entities'
  | 'clients'
  | 'accessManagement';

// Which modules each role is allowed to see in navigation.
const MODULE_ACCESS: Record<ModuleKey, AppRole[]> = {
  dashboard: ['Super Administrator', 'IT Administrator', 'Team Leader', 'Management'],
  hardware: ['Super Administrator', 'IT Administrator', 'Team Leader'],
  licenses: ['Super Administrator', 'IT Administrator', 'Management'],
  allocations: ['Super Administrator', 'IT Administrator', 'Team Leader'],
  availability: ['Super Administrator', 'IT Administrator', 'Team Leader'],
  approvals: ['Super Administrator', 'IT Administrator'],
  myRequests: ['Team Leader'],
  reports: ['Super Administrator', 'IT Administrator', 'Management'],
  search: ['Super Administrator', 'IT Administrator', 'Team Leader', 'Management'],
  executive: ['Super Administrator', 'Management'],
  users: ['Super Administrator', 'IT Administrator'],
  departments: ['Super Administrator', 'IT Administrator'],
  entities: ['Super Administrator', 'IT Administrator'],
  clients: ['Super Administrator', 'IT Administrator'],
  accessManagement: ['Super Administrator'],
};

const KNOWN_ROLES: AppRole[] = ['Super Administrator', 'IT Administrator', 'Team Leader', 'Management'];

/**
 * Resolve the current user's roles (from UI Bakery `useUser()`) into the app's known role set.
 * Falls back to 'Team Leader' (least-privileged non-viewer role) if no known role is found,
 * so the app degrades gracefully instead of crashing when roles are unassigned yet.
 */
export function resolveAppRoles(userRoles: string[] | undefined | null): AppRole[] {
  const matched = (userRoles ?? []).filter((r): r is AppRole => KNOWN_ROLES.includes(r as AppRole));
  return matched.length > 0 ? matched : ['Management'];
}

export function hasAnyRole(userRoles: AppRole[], allowed: AppRole[]): boolean {
  return userRoles.some((r) => allowed.includes(r));
}

export type RoleModuleAccessRow = { role_name: string; module_key: string; is_allowed: boolean };

/**
 * Builds a role->modules lookup from DB rows (role_module_access table), for use by
 * canAccessModule below. When DB rows are not loaded yet (undefined), callers fall back
 * to the static MODULE_ACCESS defaults so nav/pages never break due to a slow/failed query.
 */
export function buildAccessOverride(rows: RoleModuleAccessRow[] | undefined | null): Record<string, AppRole[]> | null {
  if (!rows || rows.length === 0) return null;
  const map: Record<string, AppRole[]> = {};
  for (const row of rows) {
    if (!row.is_allowed) continue;
    if (!map[row.module_key]) map[row.module_key] = [];
    map[row.module_key].push(row.role_name as AppRole);
  }
  return map;
}

export function canAccessModule(
  userRoles: AppRole[],
  module: ModuleKey,
  override?: Record<string, AppRole[]> | null
): boolean {
  const allowed = override?.[module] ?? MODULE_ACCESS[module];
  return hasAnyRole(userRoles, allowed);
}

export function getDefaultModuleAccess(): Record<ModuleKey, AppRole[]> {
  return MODULE_ACCESS;
}

export function isSuperAdmin(userRoles: AppRole[]): boolean {
  return userRoles.includes('Super Administrator');
}

export function isITAdmin(userRoles: AppRole[]): boolean {
  return userRoles.includes('IT Administrator');
}

export function isTeamLeader(userRoles: AppRole[]): boolean {
  return userRoles.includes('Team Leader');
}

export function isManagement(userRoles: AppRole[]): boolean {
  return userRoles.includes('Management');
}

// Can create/edit/delete hardware, licenses, allocations, approve requests.
export function canManage(userRoles: AppRole[]): boolean {
  return isSuperAdmin(userRoles) || isITAdmin(userRoles);
}
