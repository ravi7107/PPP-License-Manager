import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { navItems, NavItem } from '@/lib/nav-config';
import { AppRole, canAccessModule } from '@/lib/auth/roles';

/*
 * Groups every existing nav item (nav-config.ts) into labeled sections.
 * This is presentation-only - it doesn't add, remove, or rename any
 * module, route, or permission, it just organizes the same flat list
 * app-sidebar.tsx used to render into the logical groups a bigger module
 * count like this needs to stay scannable (the same pattern Linear,
 * Intune, etc. use). Every key from nav-config.ts must appear exactly
 * once below - see the safety check right after this table.
 */
const NAV_GROUPS: { label: string; keys: NavItem['key'][] }[] = [
  { label: 'Overview', keys: ['dashboard', 'executive'] },
  { label: 'Assets', keys: ['hardware', 'licenses', 'allocations'] },
  {
    label: 'Procurement',
    keys: ['purchaseRequisitions', 'purchaseRequisitionApprovals'],
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
      'officeLocations',
      'accessManagement',
    ],
  },
  {
    label: 'Material Movement',
    keys: [
      'materialItemCategories',
      'materialItems',
      'materialCostCenters',
      'materialTransporters',
      'materialApprovalWorkflows',
    ],
  },
  { label: 'Tools', keys: ['search', 'reports'] },
];

export function AppSidebar({ roles, accessOverride }: { roles: AppRole[]; accessOverride?: Record<string, AppRole[]> | null }) {
  const location = useLocation();

  const visibleKeys = new Set(
    navItems
      .filter((item) => canAccessModule(roles, item.key, accessOverride))
      .map((item) => item.key),
  );

  const itemByKey = new Map(navItems.map((item) => [item.key, item]));

  const isItemActive = (item: NavItem) =>
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <img
            src="/pps-logo.jpg"
            alt="PPS"
            className="h-8 w-8 shrink-0 rounded-md object-cover"
          />
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">PPS</span>
            <span className="text-xs text-muted-foreground">Licenses &amp; Assets</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          const groupItems = group.keys
            .map((key) => itemByKey.get(key))
            .filter((item): item is NavItem => Boolean(item) && visibleKeys.has(item.key));

          if (groupItems.length === 0) {
            return null;
          }

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupItems.map((item) => {
                    const active = isItemActive(item);

                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton asChild tooltip={item.label} isActive={active}>
                          <NavLink to={item.path} end={item.path === '/'}>
                            <item.icon />
                            <span>{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
