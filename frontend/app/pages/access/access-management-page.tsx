import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
import { ShieldCheck, RotateCcw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

const ALL_ROLES: AppRole[] = ['Super Administrator', 'IT Administrator', 'Team Leader', 'Management'];

export default function AccessManagementPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const user = useUser();
  const actorName = user?.name ?? 'System';
  const isSuperAdmin = roles.includes('Super Administrator');

  const [rows, loading, , reload]: [RoleModuleAccessRow[], boolean, Error | null, () => Promise<void>] =
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
      await saveCell({ roleName: role, moduleKey, isAllowed: next, actorName });
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
            await saveCell({ roleName: role, moduleKey: item.key, isAllowed: allowedByDefault, actorName });
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Only Super Administrators can manage role access.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Access Management</h1>
          <p className="text-sm text-muted-foreground">
            Control which roles can see each module in navigation. Changes apply immediately across the app.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefaults} disabled={pendingKey !== null || loading}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to defaults
        </Button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role &times; Module Matrix</CardTitle>
          <CardDescription>Toggle a switch to grant or revoke a role&apos;s access to a module.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Module</TableHead>
                  {ALL_ROLES.map((role) => (
                    <TableHead key={role} className="text-center">
                      {role}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {navItems
                  .filter((item) => item.key !== 'accessManagement')
                  .map((item) => (
                    <TableRow key={item.key}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                          {item.label}
                        </div>
                      </TableCell>
                      {ALL_ROLES.map((role) => {
                        const cellKey = `${item.key}:${role}`;
                        return (
                          <TableCell key={role} className="text-center">
                            <Switch
                              checked={isAllowed(item.key, role)}
                              disabled={saving || pendingKey === cellKey}
                              onCheckedChange={(checked) => toggle(item.key, role, checked)}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
