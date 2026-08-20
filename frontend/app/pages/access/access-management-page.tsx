import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLoadAction, useMutateAction } from '@/lib/uibakery';
import { ShieldCheck, RotateCcw, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { navItems } from '@/lib/nav-config';
import {
  AppRole,
  RoleModuleAccessRow,
  buildAccessOverride,
  getDefaultModuleAccess,
  hasAnyRole,
} from '@/lib/auth/roles';
import loadRoleModuleAccess from '@/actions/access/loadRoleModuleAccess';
import upsertRoleModuleAccess from '@/actions/access/upsertRoleModuleAccess';

// These four must match the real backend role names (see the comment on
// AppRole in roles.ts) - this list previously used display-style names
// ("Super Administrator", "IT Administrator", "Team Leader",
// "Management") that never match an actual logged-in user's role, so
// `isSuperAdmin` below was always false and this page silently told
// every Super Admin they weren't one.
const ALL_ROLES: AppRole[] = ['Super Admin', 'IT Admin', 'Team Lead', 'Manager'];

export default function AccessManagementPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const isSuperAdmin = roles.includes('Super Admin');

  const [rows, loading, loadError, reload]: [RoleModuleAccessRow[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(loadRoleModuleAccess, [], {});
  const [saveCell, saving] = useMutateAction(upsertRoleModuleAccess);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const override = useMemo(() => buildAccessOverride(rows) ?? {}, [rows]);
  const defaults = getDefaultModuleAccess();

  const isAllowed = (moduleKey: string, role: AppRole) => {
    const list = override[moduleKey] ?? defaults[moduleKey as keyof typeof defaults] ?? [];
    return hasAnyRole([role], list);
  };

  async function toggle(moduleKey: string, role: AppRole, next: boolean) {
    const cellKey = `${moduleKey}:${role}`;
    setPendingKey(cellKey);
    setErrorMsg(null);
    try {
      await saveCell({ roleName: role, moduleKey, isAllowed: next });
      await reload();
    } catch (err) {
      setErrorMsg('Failed to update access: ' + String(err));
    } finally {
      setPendingKey(null);
    }
  }

  async function resetToDefaults() {
    setPendingKey('reset');
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      for (const item of navItems) {
        for (const role of ALL_ROLES) {
          const allowedByDefault = hasAnyRole([role], defaults[item.key] ?? []);
          const allowedNow = isAllowed(item.key, role);
          if (allowedByDefault !== allowedNow) {
            await saveCell({ roleName: role, moduleKey: item.key, isAllowed: allowedByDefault });
          }
        }
      }
      await reload();
      setSuccessMsg('Access matrix reset to defaults.');
    } catch (err) {
      setErrorMsg('Failed to reset access: ' + String(err));
    } finally {
      setPendingKey(null);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="nova-panel">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Only Super Administrators can manage role access.</p>
        </div>
      </div>
    );
  }

  // loadRoleModuleAccess (frontend/actions/access/) now calls the real
  // RoleModuleAccessController. useLoadAction never sets `rows` to
  // anything other than an array (it stays at the [] default on a failed
  // fetch - see lib/uibakery's useLoadAction), so a genuine fetch failure
  // shows up as `loadError`, not as a non-array `rows` value the way the
  // old dead scaffolding did.
  if (!loading && loadError) {
    return (
      <div className="nova-panel">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="max-w-md text-sm text-muted-foreground">
            Couldn&apos;t load the role/module access matrix. Every
            role&apos;s module access is currently following the built-in
            defaults.
          </p>
          <Button variant="outline" size="sm" onClick={() => reload()}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const visibleModules = navItems.filter((item) => item.key !== 'accessManagement');

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Access Management</h1>
          <p className="nova-cmdbar-desc">
            Control which roles can see each module in navigation. Changes apply immediately across the app.
          </p>
        </div>

        <div className="nova-cmdbar-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            disabled={pendingKey !== null || loading}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset to defaults
          </Button>
        </div>
      </div>

      {errorMsg ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      ) : null}

      {successMsg ? (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: 'var(--nova-teal-500)',
            background: 'var(--nova-teal-50)',
            color: 'var(--nova-teal-600)',
          }}
        >
          {successMsg}
        </div>
      ) : null}

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Role &times; Module Matrix
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Toggle a switch to grant or revoke a role&apos;s access to a module.
            </p>
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {visibleModules.length} module{visibleModules.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th className="min-w-[180px]">Module</th>
                {ALL_ROLES.map((role) => (
                  <th key={role} className="text-center">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={ALL_ROLES.length + 1}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading access matrix…
                  </td>
                </tr>
              ) : (
                visibleModules.map((item) => (
                  <tr key={item.key}>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        {item.label}
                      </div>
                    </td>
                    {ALL_ROLES.map((role) => {
                      const cellKey = `${item.key}:${role}`;
                      return (
                        <td key={role} className="text-center">
                          <Switch
                            checked={isAllowed(item.key, role)}
                            disabled={saving || pendingKey === cellKey}
                            onCheckedChange={(checked) => toggle(item.key, role, checked)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
