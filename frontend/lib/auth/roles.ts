export type AppRole =
  | 'Super Admin'
  | 'IT Admin'
  | 'Team Lead'
  | 'Manager'
  | 'Employee';

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
  | 'officeLocations'
  | 'accessManagement'
  | 'purchaseRequisitions'
  | 'purchaseRequisitionApprovals'
  | 'purchaseRequisitionContacts'
  | 'purchaseRequisitionSettings'
  | 'vendors'
  | 'materialItemCategories'
  | 'materialItems'
  | 'materialCostCenters'
  | 'materialTransporters'
  | 'materialApprovalWorkflows'
  | 'materialMovements';

/*
 * Default module permissions.
 *
 * IMPORTANT:
 * These role names must match the ASP.NET/PostgreSQL Roles table:
 *
 * Super Admin
 * IT Admin
 * Team Lead
 * Manager
 * Employee
 */
const MODULE_ACCESS: Record<ModuleKey, AppRole[]> = {
  // Business-analysis dashboard (hardware/license utilization, expiry,
  // allocation activity) - scoped to Team Lead/Manager plus the admin
  // roles who already see every other module. Employee lands on their
  // own module instead (see getFirstAccessiblePath in nav-config.ts).
  dashboard: [
    'Super Admin',
    'IT Admin',
    'Team Lead',
    'Manager',
  ],

  hardware: [
    'Super Admin',
    'IT Admin',
    'Team Lead',
  ],

  licenses: [
    'Super Admin',
    'IT Admin',
    'Manager',
  ],

  allocations: [
    'Super Admin',
    'IT Admin',
    'Team Lead',
  ],

  availability: [
    'Super Admin',
    'IT Admin',
    'Team Lead',
  ],

  approvals: [
    'Super Admin',
    'IT Admin',
  ],

  myRequests: [
    'Team Lead',
    'Employee',
  ],

  reports: [
    'Super Admin',
    'IT Admin',
    'Manager',
  ],

  search: [
    'Super Admin',
    'IT Admin',
    'Team Lead',
    'Manager',
  ],

  executive: [
    'Super Admin',
    'Manager',
  ],

  users: [
    'Super Admin',
    'IT Admin',
  ],

  departments: [
    'Super Admin',
    'IT Admin',
  ],

  entities: [
    'Super Admin',
    'IT Admin',
  ],

  clients: [
    'Super Admin',
    'IT Admin',
  ],

  officeLocations: [
    'Super Admin',
    'IT Admin',
    'Team Lead',
    'Manager',
  ],

  // Vendor master list administration - same access level as the other
  // Directory admin modules (Departments/Entities/Clients).
  vendors: [
    'Super Admin',
    'IT Admin',
  ],

  accessManagement: [
    'Super Admin',
  ],

  // Any employee can raise a purchase requisition - it's not gated to a
  // specific role the way Hardware/Licenses admin actions are.
  purchaseRequisitions: [
    'Super Admin',
    'IT Admin',
    'Team Lead',
    'Manager',
    'Employee',
  ],

  // A requester can name ANY active user in their company as a stage
  // approver (see PurchaseRequisitionService.GetApproverCandidatesAsync),
  // not just certain roles, so this queue is open the same way.
  purchaseRequisitionApprovals: [
    'Super Admin',
    'IT Admin',
    'Team Lead',
    'Manager',
    'Employee',
  ],

  // Maintaining the Initiator/Approver contact list (external, no-login
  // Gmail/Office 365 addresses) and the Finance notification email is an
  // admin task - same access level as the other Directory admin modules
  // (Departments/Entities/Clients/Vendors).
  purchaseRequisitionContacts: [
    'Super Admin',
    'IT Admin',
  ],

  purchaseRequisitionSettings: [
    'Super Admin',
    'IT Admin',
  ],

  // Material Movement Management masters - same access level as the other
  // Directory admin modules (Departments/Entities/Clients/Vendors).
  materialItemCategories: [
    'Super Admin',
    'IT Admin',
  ],

  materialItems: [
    'Super Admin',
    'IT Admin',
  ],

  materialCostCenters: [
    'Super Admin',
    'IT Admin',
  ],

  materialTransporters: [
    'Super Admin',
    'IT Admin',
  ],

  // The approval matrix config screen - Super Admin/IT Admin only, same
  // as the other Material Movement masters (not opened up to Team Lead/
  // Manager the way the eventual movement-creation screens will be).
  materialApprovalWorkflows: [
    'Super Admin',
    'IT Admin',
  ],

  // Raising/editing/deleting a movement Draft is open to any employee,
  // same as Purchase Requisitions - it's not an admin-only masters
  // screen like the four above.
  materialMovements: [
    'Super Admin',
    'IT Admin',
    'Team Lead',
    'Manager',
    'Employee',
  ],
};

const KNOWN_ROLES: AppRole[] = [
  'Super Admin',
  'IT Admin',
  'Team Lead',
  'Manager',
  'Employee',
];

/*
 * Converts any legacy UI Bakery role names to the new backend role names.
 *
 * This keeps older parts of the frontend compatible while the application
 * is migrated from UI Bakery authentication to the ASP.NET API.
 */
function normalizeRole(role: string): AppRole | null {
  const normalized = role.trim().toLowerCase();

  switch (normalized) {
    case 'super admin':
    case 'super administrator':
      return 'Super Admin';

    case 'it admin':
    case 'it administrator':
      return 'IT Admin';

    case 'team lead':
    case 'team leader':
      return 'Team Lead';

    case 'manager':
    case 'management':
      return 'Manager';

    case 'employee':
      return 'Employee';

    default:
      return null;
  }
}

/*
 * Resolve current user's roles into the application's known role set.
 */
export function resolveAppRoles(
  userRoles: string[] | undefined | null
): AppRole[] {
  const resolved = (userRoles ?? [])
    .map(normalizeRole)
    .filter((role): role is AppRole => role !== null);

  return Array.from(new Set(resolved));
}

export function hasAnyRole(
  userRoles: AppRole[],
  allowed: AppRole[]
): boolean {
  return userRoles.some((role) => allowed.includes(role));
}

export type RoleModuleAccessRow = {
  role_name: string;
  module_key: string;
  is_allowed: boolean;
};

/*
 * Build role/module permissions returned by the database.
 *
 * Legacy role names are normalized so older DB rows don't immediately
 * break authorization during migration.
 */
export function buildAccessOverride(
  rows: RoleModuleAccessRow[] | undefined | null
): Record<string, AppRole[]> | null {
  // Array.isArray guard (not just a truthy/length check) because the
  // Access Management page's data loader can currently hand this a
  // non-array value (see access-management-page.tsx) - without this,
  // `rows.length === 0` is false for a non-array object (length is
  // undefined, not 0), so execution fell through to `for (const row of
  // rows)` below and threw "TypeError: rows is not iterable", crashing
  // the whole page on load.
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const map: Record<string, AppRole[]> = {};

  for (const row of rows) {
    if (!row.is_allowed) {
      continue;
    }

    const role = normalizeRole(row.role_name);

    if (!role) {
      continue;
    }

    if (!map[row.module_key]) {
      map[row.module_key] = [];
    }

    if (!map[row.module_key].includes(role)) {
      map[row.module_key].push(role);
    }
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

export function getDefaultModuleAccess(): Record<
  ModuleKey,
  AppRole[]
> {
  return MODULE_ACCESS;
}

export function isSuperAdmin(userRoles: AppRole[]): boolean {
  return userRoles.includes('Super Admin');
}

export function isITAdmin(userRoles: AppRole[]): boolean {
  return userRoles.includes('IT Admin');
}

export function isTeamLeader(userRoles: AppRole[]): boolean {
  return userRoles.includes('Team Lead');
}

export function isManagement(userRoles: AppRole[]): boolean {
  return userRoles.includes('Manager');
}

export function isEmployee(userRoles: AppRole[]): boolean {
  return userRoles.includes('Employee');
}

/*
 * Users allowed to create/edit/delete operational records.
 */
export function canManage(userRoles: AppRole[]): boolean {
  return isSuperAdmin(userRoles) || isITAdmin(userRoles);
}
