import { useNavigate } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
}

export function AppTopbar({
  userName,
  roles,
  pageTitle,
}: AppTopbarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />

      <Separator
        orientation="vertical"
        className="h-5"
      />

      <h1 className="text-sm font-semibold md:text-base">
        {pageTitle}
      </h1>

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
