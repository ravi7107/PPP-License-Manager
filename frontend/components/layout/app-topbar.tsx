import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Landmark, ChevronRight, Search } from 'lucide-react';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { NotificationsBell } from '@/components/layout/notifications-bell';
import { AppRole } from '@/lib/auth/roles';
import { useAuth } from '@/lib/auth/auth-context';

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

interface AppTopbarProps {
  userName: string | undefined;
  roles: AppRole[];
  pageTitle: string;
  breadcrumbGroup?: string;
  canSearch?: boolean;
  companyName?: string | null;
}

export function AppTopbar({
  userName,
  roles,
  pageTitle,
  breadcrumbGroup,
  canSearch,
  companyName,
}: AppTopbarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();

    const q = searchQuery.trim();

    if (!q) {
      return;
    }

    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  // Only shown when the group is known and actually distinct from the
  // page title itself (e.g. Dashboard's own group is "Overview", which
  // is worth showing as "Overview > Dashboard" - but this still guards
  // against a page whose label happens to match its group name).
  const showBreadcrumbGroup =
    breadcrumbGroup && breadcrumbGroup !== pageTitle;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />

      <Separator
        orientation="vertical"
        className="h-5"
      />

      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        {showBreadcrumbGroup ? (
          <>
            <span className="truncate text-muted-foreground">
              {breadcrumbGroup}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </>
        ) : null}

        <span className="truncate font-semibold md:text-base">
          {pageTitle}
        </span>
      </div>

      {canSearch ? (
        <form
          onSubmit={handleSearchSubmit}
          className="relative ml-4 hidden w-56 lg:block"
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search…"
            className="h-8 pl-8 text-xs"
          />
        </form>
      ) : null}

      <div className="ml-auto flex items-center gap-3">
        <NotificationsBell />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent focus:outline-none">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">
                {initials(userName)}
              </AvatarFallback>
            </Avatar>

            <div className="hidden flex-col items-start leading-tight sm:flex">
              <span className="text-xs font-medium">
                {userName ?? 'Unknown user'}
              </span>

              <span className="text-[11px] text-muted-foreground">
                {roles[0] ?? 'No role'}
                {companyName ? ` · ${companyName}` : ''}
              </span>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56"
          >
            <DropdownMenuLabel>
              {userName ?? 'Unknown user'}
            </DropdownMenuLabel>

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

            {companyName && (
              <div className="flex items-center gap-1.5 px-2 pb-1.5 text-xs text-muted-foreground">
                <Landmark className="h-3.5 w-3.5" />
                Entity: {companyName}
              </div>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem disabled>
              <Settings className="mr-2 h-4 w-4" />
              Account settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
