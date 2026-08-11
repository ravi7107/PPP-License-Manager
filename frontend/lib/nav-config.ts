import {
  LayoutDashboard,
  HardDrive,
  KeySquare,
  Share2,
  ClipboardCheck,
  BarChart3,
  FileText,
  UserX,
  Search,
  Crown,
  Users,
  Building,
  Landmark,
  Briefcase,
  ShieldCheck, MapPinned, ClipboardList, Truck
} from 'lucide-react';
import { AppRole, ModuleKey, canAccessModule } from '@/lib/auth/roles';

export interface NavItem {
  key: ModuleKey;
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

export const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { key: 'executive', label: 'Executive Dashboard', path: '/executive', icon: Crown },
  { key: 'hardware', label: 'Hardware Assets', path: '/hardware', icon: HardDrive },
  { key: 'licenses', label: 'Software Licenses', path: '/licenses', icon: KeySquare },
  { key: 'allocations', label: 'Allocations', path: '/allocations', icon: Share2 },
  { key: 'purchaseRequisitions', label: 'Purchase Requisitions', path: '/purchase-requisitions', icon: ClipboardList },
  { key: 'purchaseRequisitionApprovals', label: 'PR Approvals', path: '/purchase-requisition-approvals', icon: ClipboardCheck },
  { key: 'availability', label: 'Resource Availability', path: '/availability', icon: UserX },
  { key: 'approvals', label: 'Approvals', path: '/approvals', icon: ClipboardCheck },
  { key: 'myRequests', label: 'My Requests', path: '/my-requests', icon: FileText },
  { key: 'users', label: 'Users', path: '/users', icon: Users },
  { key: 'departments', label: 'Departments', path: '/departments', icon: Building },
  { key: 'entities', label: 'Entities', path: '/entities', icon: Landmark },
  { key: 'clients', label: 'Clients', path: '/clients', icon: Briefcase },
  { key: 'vendors', label: 'Vendors', path: '/vendors', icon: Truck },
  { key: 'officeLocations', label: 'Office Locations', path: '/office-locations', icon: MapPinned },
  { key: 'accessManagement', label: 'Access Management', path: '/access-management', icon: ShieldCheck },
  { key: 'search', label: 'Global Search', path: '/search', icon: Search },
  { key: 'reports', label: 'Reports', path: '/reports', icon: BarChart3 },
];

/*
 * First nav item (in navItems order) a role actually has access to -
 * used to send a user somewhere sensible when they land on a route their
 * role can no longer see (e.g. an Employee hitting "/" now that the
 * Dashboard is Team Lead/Manager/admin-only). Returns null only if the
 * role has no accessible module at all, which shouldn't happen in
 * practice given every role has at least one module in MODULE_ACCESS.
 */
export function getFirstAccessiblePath(
  roles: AppRole[],
  accessOverride?: Record<string, AppRole[]> | null,
  exclude: ModuleKey[] = []
): string | null {
  const item = navItems.find(
    (candidate) =>
      !exclude.includes(candidate.key) &&
      canAccessModule(roles, candidate.key, accessOverride)
  );

  return item ? item.path : null;
}
