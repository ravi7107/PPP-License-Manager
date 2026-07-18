import { Outlet, useLocation } from 'react-router-dom';
import { useLoadAction } from '@/lib/uibakery';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';
import { resolveAppRoles, buildAccessOverride, RoleModuleAccessRow, AppRole } from '@/lib/auth/roles';
import { navItems } from '@/lib/nav-config';
import loadRoleModuleAccess from '@/actions/access/loadRoleModuleAccess';

export function AppLayout() {
  const user = {
  id: "admin",
  name: "Administrator",
  email: "admin@pps.local",
  roles: ["IT_ADMIN"],
  };

const roles = resolveAppRoles(user.roles);
  const location = useLocation();
// Temporary until backend is connected
  const accessRows: RoleModuleAccessRow[] = [];

 const accessOverride = buildAccessOverride(accessRows);	
  const currentItem = navItems.find((item) => (item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)));

  return (
    <SidebarProvider>
      <AppSidebar roles={roles} accessOverride={accessOverride} />
      <SidebarInset>
        <AppTopbar userName={user?.name} roles={roles} pageTitle={currentItem?.label ?? 'Dashboard'} />
        <div className="flex-1 overflow-auto bg-muted/30 p-4 md:p-6">
          <Outlet context={{ roles, accessOverride } satisfies { roles: AppRole[]; accessOverride: Record<string, AppRole[]> | null }} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
