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
  ShieldCheck, MapPinned, ClipboardList, Truck, Tags, Package, Wallet, GitBranch, ArrowLeftRight,
  Contact, Settings, UploadCloud, PieChart, SlidersHorizontal
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
  { key: 'purchaseRequisitionContacts', label: 'PR Contacts', path: '/purchase-requisition-contacts', icon: Contact },
  { key: 'purchaseRequisitionSettings', label: 'PR Settings', path: '/purchase-requisition-settings', icon: Settings },
  { key: 'availability', label: 'Resource Availability', path: '/availability', icon: UserX },
  { key: 'approvals', label: 'Approvals', path: '/approvals', icon: ClipboardCheck },
  { key: 'myRequests', label: 'My Requests', path: '/my-requests', icon: FileText },
  { key: 'users', label: 'Users', path: '/users', icon: Users },
  { key: 'departments', label: 'Departments', path: '/departments', icon: Building },
  { key: 'entities', label: 'Entities', path: '/entities', icon: Landmark },
  { key: 'clients', label: 'Clients', path: '/clients', icon: Briefcase },
  { key: 'vendors', label: 'Vendors', path: '/vendors', icon: Truck },
  { key: 'materialMovements', label: 'Material Movements', path: '/material-movements', icon: ArrowLeftRight },
  { key: 'materialItemCategories', label: 'Material Categories', path: '/material-item-categories', icon: Tags },
  { key: 'materialItems', label: 'Material Items', path: '/material-items', icon: Package },
  { key: 'materialCostCenters', label: 'Material Cost Centers', path: '/material-cost-centers', icon: Wallet },
  { key: 'materialTransporters', label: 'Material Transporters', path: '/material-transporters', icon: Truck },
  { key: 'materialApprovalWorkflows', label: 'Approval Workflows', path: '/material-approval-workflows', icon: GitBranch },
  // Order matters: app-layout.tsx resolves the "current" nav item via
  // navItems.find(item => pathname.startsWith(item.path)), so the more
  // specific /utilization/... paths must be listed BEFORE the bare
  // /utilization dashboard path - otherwise the dashboard's shorter path
  // would wrongly "win" the prefix match for the upload/settings pages.
  { key: 'utilizationUpload', label: 'Upload Usage Report', path: '/utilization/upload', icon: UploadCloud },
  { key: 'utilizationSettings', label: 'Utilization Settings', path: '/utilization/settings', icon: SlidersHorizontal },
  { key: 'utilizationDashboard', label: 'License Utilization', path: '/utilization', icon: PieChart },
  { key: 'officeLocations', label: 'Office Locations', path: '/office-locations', icon: MapPinned },
  { key: 'accessManagement', label: 'Access Management', path: '/access-management', icon: ShieldCheck },
  { key: 'search', label: 'Global Search', path: '/search', icon: Search },
  { key: 'reports', label: 'Reports', path: '/reports', icon: BarChart3 },
];

/*
 * Groups every nav item into labeled sections for the sidebar (and the
 * topbar breadcrumb, which needs to know which group the current page
 * belongs to). Presentation-only - doesn't add, remove, or rename any
 * module, route, or permission. Every key in navItems must appear here
 * exactly once; getNavGroupLabel() returns undefined for anything
 * missed, which just means that page's breadcrumb skips the group
 * prefix rather than crashing.
 */
export const NAV_GROUPS: { label: string; keys: NavItem['key'][] }[] = [
  { label: 'Overview', keys: ['dashboard', 'executive'] },
  { label: 'Assets', keys: ['hardware', 'officeLocations', 'licenses', 'allocations'] },
  {
    label: 'Utilization Analytics',
    keys: ['utilizationDashboard', 'utilizationUpload', 'utilizationSettings'],
  },
  {
    label: 'Procurement',
    keys: [
      'purchaseRequisitions',
      'purchaseRequisitionApprovals',
      'purchaseRequisitionContacts',
      'purchaseRequisitionSettings'
    ],
  },
  {
    label: 'Management',
    keys: ['availability', 'approvals', 'myRequests'],
  },
  {
    label: 'Administration',
    keys: [
      'users',
      'departments',
      'entities',
      'clients',
      'vendors',

      'accessManagement'
    ],
  },
  {
    label: 'Material Movement',
    keys: [
      'materialMovements',
      'materialItemCategories',
      'materialItems',
      'materialCostCenters',
      'materialTransporters',
      'materialApprovalWorkflows'
    ],
  },
  { label: 'Tools', keys: ['search', 'reports'] },
];

export function getNavGroupLabel(key: ModuleKey): string | undefined {
  return NAV_GROUPS.find((group) => group.keys.includes(key))?.label;
}

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
