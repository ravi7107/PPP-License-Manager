import { Outlet, useLocation } from 'react-router-dom';

import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';

import {
  resolveAppRoles,
  buildAccessOverride,
  RoleModuleAccessRow,
  AppRole,
} from '@/lib/auth/roles';

import { navItems } from '@/lib/nav-config';
import { useAuth } from '@/lib/auth/auth-context';

export function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  /*
   * The authenticated backend currently returns one role:
   *
   * Super Admin
   * IT Admin
   * Team Lead
   * Manager
   * Employee
   */
  const roles = resolveAppRoles(
    user?.role ? [user.role] : []
  );

  /*
   * DB-driven module permissions can be connected later.
   * For now roles.ts provides the default module permissions.
   */
  const accessRows: RoleModuleAccessRow[] = [];

  const accessOverride = buildAccessOverride(accessRows);

  const currentItem = navItems.find((item) =>
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path)
  );

  const userName =
    user?.fullName ||
    user?.email ||
    'User';

  return (
    <SidebarProvider>
      <AppSidebar
        roles={roles}
        accessOverride={accessOverride}
      />

      <SidebarInset>
        <AppTopbar
          userName={userName}
          roles={roles}
          pageTitle={currentItem?.label ?? 'Dashboard'}
          companyName={user?.companyName}
        />

        <div className="flex-1 overflow-auto bg-muted/30 p-4 md:p-6">
          <Outlet
            context={{
              roles,
              accessOverride,
            } satisfies {
              roles: AppRole[];
              accessOverride: Record<string, AppRole[]> | null;
            }}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
