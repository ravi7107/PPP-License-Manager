import { useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, LogOut, Search, Settings } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import * as navConfig from '@/lib/nav-config';
import { NavItem } from '@/lib/nav-config';
import { AppRole, ModuleKey, canAccessModule } from '@/lib/auth/roles';
import { useAuth } from '@/lib/auth/auth-context';

type NavGroup = { label: string; keys: ModuleKey[] };

function resolveNavGroups(): NavGroup[] {
  const config = navConfig as typeof navConfig & {
    NAV_GROUPS?: { label: string; keys: ModuleKey[] }[];
  };

  if (Array.isArray(config.NAV_GROUPS) && config.NAV_GROUPS.length > 0) {
    return config.NAV_GROUPS;
  }

  return (config.navSections ?? []).map((section) => ({
    label: section.label,
    keys: section.keys,
  }));
}

function initials(name: string | undefined): string {
  if (!name) return 'SA';

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
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [navSearch, setNavSearch] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => resolveNavGroups(), []);
  const itemByKey = useMemo(
    () => new Map(navConfig.navItems.map((item) => [item.key, item])),
    []
  );

  const visibleKeys = useMemo(() => {
    return new Set(
      navConfig.navItems
        .filter((item) => canAccessModule(roles, item.key, accessOverride))
        .map((item) => item.key)
    );
  }, [roles, accessOverride]);

  const searchQuery = navSearch.trim().toLowerCase();
  const searching = searchQuery.length > 0;

  const userName = user?.fullName || user?.email || 'User';
  const userRole = roles[0] ?? user?.role ?? 'No role';

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function toggleGroup(label: string) {
    setExpandedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1">
          {logoFailed ? (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#1d4ed8] text-[10px] font-semibold tracking-wide text-white">
              PPS
            </div>
          ) : (
            <img
              src="/pps-logo.jpg"
              alt="PPS"
              className="size-8 shrink-0 rounded-md object-cover"
              onError={() => setLogoFailed(true)}
            />
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-semibold">PPS</div>
            <div className="truncate text-[11px] text-muted-foreground">
              SmartAsset
            </div>
          </div>
        </div>

        <div className="relative px-1 pb-0.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            ref={searchRef}
            value={navSearch}
            onChange={(event) => setNavSearch(event.target.value)}
            placeholder="Find a page..."
            aria-label="Find a page"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => {
          const groupItems = group.keys
            .map((key) => itemByKey.get(key))
            .filter((item): item is NavItem => Boolean(item) && visibleKeys.has(item.key))
            .filter((item) =>
              searching ? item.label.toLowerCase().includes(searchQuery) : true
            );

          if (groupItems.length === 0) return null;

          const hasActiveChild = groupItems.some((item) =>
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
          );
          const groupOpen = searching || expandedGroups.has(group.label) || hasActiveChild;

          return (
            <SidebarGroup key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={groupOpen}
                className="mb-0.5 flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <span className="min-w-0 flex-1 truncate">{group.label}</span>
                {groupOpen ? (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>
              {groupOpen ? (
              <SidebarGroupContent>
                <SidebarMenu className="ml-3 border-l border-sidebar-border/80 pl-2">
                  {groupItems.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.label}
                        isActive={
                          item.path === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(item.path)
                        }
                      >
                        <NavLink to={item.path} end={item.path === '/'}>
                          <item.icon />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
              ) : null}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label={userName}
            >
              <Avatar className="size-8">
                <AvatarFallback className="text-[10px] font-medium">
                  {initials(userName)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-medium">
                  {userName}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {userRole}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>{userName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <Settings className="mr-2 size-4" />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
