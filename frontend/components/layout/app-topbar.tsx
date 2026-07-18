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

function initials(name: string | undefined): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AppTopbar({ userName, roles, pageTitle }: { userName: string | undefined; roles: AppRole[]; pageTitle: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <h1 className="text-sm font-semibold md:text-base">{pageTitle}</h1>
      <div className="ml-auto flex items-center gap-3">
        <NotificationsBell />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{initials(userName)}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start leading-tight sm:flex">
              <span className="text-xs font-medium">{userName ?? 'Unknown user'}</span>
              <span className="text-[11px] text-muted-foreground">{roles[0] ?? 'No role'}</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{userName ?? 'Unknown user'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex flex-wrap gap-1 px-2 py-1.5">
              {roles.map((r) => (
                <Badge key={r} variant="secondary" className="text-[11px] font-normal">
                  {r}
                </Badge>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Account settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
