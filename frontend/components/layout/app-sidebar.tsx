import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Search, Settings, Landmark } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { navItems, NavItem, NAV_GROUPS } from '@/lib/nav-config';
import { AppRole, canAccessModule } from '@/lib/auth/roles';
import { useAuth } from '@/lib/auth/auth-context';

// Which nav groups are collapsed, persisted across reloads/sessions -
// this is purely a display preference (which sections a user likes to
// keep tucked away), never anything that affects what they can access,
// so a stale/cleared value just means "show every group," never a
// broken or locked-out state.
const COLLAPSED_GROUPS_STORAGE_KEY = 'pps-sidebar-collapsed-groups';

function loadCollapsedGroups(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY);
    if (!raw) return new Set();

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    // Private browsing, corrupted value, storage disabled, etc. -
    // fall back to "everything expanded" rather than breaking the
    // sidebar.
    return new Set();
  }
}

function saveCollapsedGroups(groups: Set<string>) {
  try {
    localStorage.setItem(
      COLLAPSED_GROUPS_STORAGE_KEY,
      JSON.stringify(Array.from(groups))
    );
  } catch {
    // Ignore - this is a nice-to-have preference, not critical state.
  }
}

function initials(name: string | undefined): string {
  if (!name) return 'U';

  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AppSidebar({
  roles,
  accessOverride,
}: {
  roles: AppRole[];
  accessOverride?: Record<string, AppRole[]> | null;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { state: sidebarState } = useSidebar();

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => loadCollapsedGroups()
  );
  const [navSearch, setNavSearch] = useState('');

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

  const activeGroupLabel = useMemo(() => {
    const activeItem = navItems.find(
      (item) => visibleKeys.has(item.key) && isItemActive(item)
    );

    if (!activeItem) return undefined;

    return NAV_GROUPS.find((group) =>
      group.keys.includes(activeItem.key)
    )?.label;
  }, [location.pathname, roles, accessOverride]);

  // Whichever group the current page lives in should always be visible
  // when you land on it - even if you'd previously collapsed it -
  // otherwise navigating somewhere could leave you looking at a
  // sidebar with no visible indication of where you are.
  useEffect(() => {
    if (!activeGroupLabel) return;

    setCollapsedGroups((previous) => {
      if (!previous.has(activeGroupLabel)) return previous;

      const next = new Set(previous);
      next.delete(activeGroupLabel);
      return next;
    });
  }, [activeGroupLabel]);

  useEffect(() => {
    saveCollapsedGroups(collapsedGroups);
  }, [collapsedGroups]);

  function toggleGroup(label: string) {
    setCollapsedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  // Icon-only mode (the whole sidebar collapsed, not an individual
  // group) has no room to show group headers/chevrons - or the search
  // box itself, which is hidden via group-data-[collapsible=icon] -
  // so every item must render regardless of per-group collapse state
  // AND regardless of any search term left over from before the
  // sidebar was collapsed, same as before this feature existed.
  const iconOnly = sidebarState === 'collapsed';

  const searching = !iconOnly && navSearch.trim().length > 0;
  const searchQuery = navSearch.trim().toLowerCase();

  const userName = user?.fullName || user?.email || 'User';

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

        <div className="relative px-2 pb-1 group-data-[collapsible=icon]:hidden">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            value={navSearch}
            onChange={(event) => setNavSearch(event.target.value)}
            placeholder="Find a page…"
            className="h-7 pl-7 text-xs"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0.5">
        {NAV_GROUPS.map((group) => {
          const allGroupItems = group.keys
            .map((key) => itemByKey.get(key))
            .filter((item): item is NavItem => Boolean(item) && visibleKeys.has(item.key));

          if (allGroupItems.length === 0) {
            return null;
          }

          const groupItems = searching
            ? allGroupItems.filter((item) =>
                item.label.toLowerCase().includes(searchQuery)
              )
            : allGroupItems;

          if (searching && groupItems.length === 0) {
            return null;
          }

          const expanded =
            iconOnly || searching || !collapsedGroups.has(group.label);

          return (
            <SidebarGroup key={group.label} className="p-1.5">
              <SidebarGroupLabel asChild>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="flex h-6 w-full items-center justify-between gap-1 text-[11px] font-semibold uppercase tracking-wider"
                  aria-expanded={expanded}
                >
                  <span className="truncate">{group.label}</span>
                  <ChevronDown
                    className={[
                      'h-3 w-3 shrink-0 text-muted-foreground/70 transition-transform duration-150',
                      expanded ? '' : '-rotate-90',
                    ].join(' ')}
                  />
                </button>
              </SidebarGroupLabel>

              {expanded && (
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {groupItems.map((item) => {
                      const active = isItemActive(item);

                      return (
                        <SidebarMenuItem key={item.key}>
                          <SidebarMenuButton
                            asChild
                            size="sm"
                            tooltip={item.label}
                            isActive={active}
                          >
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
              )}
            </SidebarGroup>
          );
        })}

        {searching &&
          NAV_GROUPS.every((group) => {
            const items = group.keys
              .map((key) => itemByKey.get(key))
              .filter((item): item is NavItem => Boolean(item) && visibleKeys.has(item.key));

            return !items.some((item) =>
              item.label.toLowerCase().includes(searchQuery)
            );
          }) && (
            <p className="px-3 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              No matching pages.
            </p>
          )}
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1.5 hover:bg-sidebar-accent focus:outline-none">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs">
                {initials(userName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex min-w-0 flex-col items-start leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-xs font-medium">
                {userName}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {roles[0] ?? 'No role'}
              </span>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel>{userName}</DropdownMenuLabel>

            <DropdownMenuSeparator />

            <div className="flex flex-wrap gap-1 px-2 py-1.5">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <Badge
                    key={role}
                    variant="secondary"
                    className="text-[11px] font-normal"
                  >
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  No role assigned
                </span>
              )}
            </div>

            {user?.companyName && (
              <div className="flex items-center gap-1.5 px-2 pb-1.5 text-xs text-muted-foreground">
                <Landmark className="h-3.5 w-3.5" />
                Entity: {user.companyName}
              </div>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem disabled>
              <Settings className="mr-2 h-4 w-4" />
              Account settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
