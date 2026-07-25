import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
import { Plus, Search, Pencil, Trash2, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AppRole, canManage } from '@/lib/auth/roles';
import loadDepartmentsFull from '@/actions/directory/loadDepartments';
import createDepartment from '@/actions/directory/createDepartment';
import updateDepartment from '@/actions/directory/updateDepartment';
import deleteDepartment from '@/actions/directory/deleteDepartment';
import { DepartmentFormDialog, DepartmentFormValues } from '@/app/pages/directory/components/department-form-dialog';
import { DepartmentRecord } from '@/app/pages/directory/types';

export default function DepartmentsPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const user = useUser();
  const canEdit = canManage(roles);
  const actorName = user?.name ?? 'System';

  const [departments, loading, , reload]: [DepartmentRecord[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(loadDepartmentsFull, [], {});

  const [createDept, creating] = useMutateAction(createDepartment);
  const [editDept, updating] = useMutateAction(updateDepartment);
  const [removeDept, deleting] = useMutateAction(deleteDepartment);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<DepartmentRecord | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return departments;
    const q = search.trim().toLowerCase();
    return departments.filter((d) => [d.name, d.code].some((f) => f.toLowerCase().includes(q)));
  }, [departments, search]);

  const handleSubmit = async (values: DepartmentFormValues) => {
    if (selected) {
      await editDept({ id: selected.id, ...values, description: values.description || null, actorName });
    } else {
      await createDept({ ...values, description: values.description || null, actorName });
    }
    setFormOpen(false);
    await reload();
  };

  const handleDelete = async () => {
    if (!selected) return;
    await removeDept({ id: selected.id, actorName });
    setDeleteOpen(false);
    await reload();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" /> Departments
            </CardTitle>
            <CardDescription>Organizational departments used for user and asset assignment.</CardDescription>
          </div>
          {canEdit ? (
            <Button
              size="sm"
              onClick={() => {
                setSelected(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Department
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search departments…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No departments found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.code}</TableCell>
                    <TableCell className="max-w-xs truncate">{d.description ?? '—'}</TableCell>
                    <TableCell>{d.user_count}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === 'Active' ? 'default' : 'secondary'}>{d.status}</Badge>
                    </TableCell>
                    {canEdit ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelected(d);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelected(d);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <DepartmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        department={selected}
        saving={creating || updating}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete "{selected?.name}". Users currently assigned to it will keep their assignment reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
