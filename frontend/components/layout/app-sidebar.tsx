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
import { navItems, NavItem, NAV_GROUPS } from '@/lib/nav-config';
import { AppRole, canAccessModule } from '@/lib/auth/roles';

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
            <span className="text-xs text-muted-foreground">SmartAsset</span>
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
