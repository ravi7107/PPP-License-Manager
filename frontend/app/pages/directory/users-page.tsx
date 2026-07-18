import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
import { Search, Pencil, Users as UsersIcon, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppRole, canManage } from '@/lib/auth/roles';
import loadUsersFull from '@/actions/directory/loadUsersFull';
import updateUserAssignment from '@/actions/directory/updateUserAssignment';
import { loadDepartments, loadEntities } from '@/actions/assets/loadAssetLookups';
import { UserAssignmentDialog, UserAssignmentFormValues } from '@/app/pages/directory/components/user-assignment-dialog';
import { DirectoryUserRecord } from '@/app/pages/directory/types';
import { LookupOption } from '@/app/pages/hardware/types';

export default function UsersPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const user = useUser();
  const canEdit = canManage(roles);
  const actorName = user?.name ?? 'System';

  const [users, loading, , reload]: [DirectoryUserRecord[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadUsersFull,
    [],
    {},
  );
  const [departments]: [LookupOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(loadDepartments, [], {});
  const [entities]: [LookupOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(loadEntities, [], {});

  const [saveAssignment, saving] = useMutateAction(updateUserAssignment);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<DirectoryUserRecord | null>(null);

  const roleOptions = useMemo(() => Array.from(new Set(users.map((u) => u.role))).sort(), [users]);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== 'all') list = list.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((u) => [u.full_name, u.email, u.department_name ?? '', u.entity_name ?? ''].some((f) => f.toLowerCase().includes(q)));
    }
    return list;
  }, [users, search, roleFilter]);

  const handleSubmit = async (values: UserAssignmentFormValues) => {
    if (!selected) return;
    await saveAssignment({
      id: selected.id,
      departmentId: values.departmentId || null,
      entityId: values.entityId || null,
      status: values.status,
      actorName,
    });
    setFormOpen(false);
    await reload();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" /> Users Directory
            </CardTitle>
            <CardDescription>Employee directory imported from the HR roster. Edit department/entity assignment and status.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Status</TableHead>
                {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {u.full_name}
                        {u.is_team_leader ? <Crown className="h-3.5 w-3.5 text-amber-500" /> : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.role}</Badge>
                    </TableCell>
                    <TableCell>{u.department_name ?? '—'}</TableCell>
                    <TableCell>{u.entity_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'Active' ? 'default' : 'secondary'}>{u.status}</Badge>
                    </TableCell>
                    {canEdit ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelected(u);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserAssignmentDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        targetUser={selected}
        departments={departments as unknown as LookupOption[]}
        entities={entities as unknown as LookupOption[]}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
