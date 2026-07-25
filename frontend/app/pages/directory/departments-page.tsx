import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Building } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

import {
  Department,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '@/lib/api/departments.api';

import {
  Company,
  getCompanies,
} from '@/lib/api/companies.api';

import {
  DepartmentFormDialog,
  DepartmentFormValues,
} from '@/app/pages/directory/components/department-form-dialog';

export default function DepartmentsPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const canEdit = canManage(roles);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selected, setSelected] =
    useState<Department | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [departmentData, companyData] =
        await Promise.all([
          getDepartments(),
          getCompanies(),
        ]);

      setDepartments(
        Array.isArray(departmentData)
          ? departmentData
          : []
      );

      setCompanies(
        Array.isArray(companyData)
          ? companyData
          : []
      );
    } catch (err) {
      console.error('Failed to load departments:', err);

      setError(
        'Unable to load departments. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return departments;
    }

    return departments.filter((department) =>
      [
        department.departmentName,
        department.departmentCode,
        department.companyName,
        department.description ?? '',
      ].some((value) =>
        value.toLowerCase().includes(q)
      )
    );
  }, [departments, search]);

  const handleSubmit = async (
    values: DepartmentFormValues
  ) => {
    setError(null);

    const request = {
      companyId: Number(values.companyId),
      departmentName: values.departmentName.trim(),
      departmentCode: values.departmentCode.trim(),
      description:
        values.description.trim() || null,
    };

    try {
      if (selected) {
        setUpdating(true);

        await updateDepartment(
          selected.id,
          {
            ...request,
            isActive: values.status === 'Active',
          }
        );
      } else {
        setCreating(true);

        await createDepartment(request);
      }

      setFormOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error(
        'Failed to save department:',
        err
      );

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to save department. Please try again.';

      setError(message);
    } finally {
      setCreating(false);
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteDepartment(selected.id);

      setDeleteOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error(
        'Failed to deactivate department:',
        err
      );

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to deactivate department.';

      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Departments
            </CardTitle>

            <CardDescription>
              Organizational departments mapped to
              PPS legal entities.
            </CardDescription>
          </div>

          {canEdit ? (
            <Button
              size="sm"
              onClick={() => {
                setSelected(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

            <Input
              placeholder="Search departments…"
              className="pl-8"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>

                {canEdit ? (
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 6 : 5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading departments…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 6 : 5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No departments found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="font-medium">
                      {department.departmentName}
                    </TableCell>

                    <TableCell>
                      {department.departmentCode}
                    </TableCell>

                    <TableCell>
                      {department.companyName || '—'}
                    </TableCell>

                    <TableCell className="max-w-xs truncate">
                      {department.description ?? '—'}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          department.isActive
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {department.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {canEdit ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit department"
                          onClick={() => {
                            setSelected(department);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Deactivate department"
                          onClick={() => {
                            setSelected(department);
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
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
        department={selected}
        companies={companies}
        saving={creating || updating}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate department?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This will mark "
              {selected?.departmentName}" as inactive.
              Historical records will remain available.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting
                ? 'Deactivating…'
                : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
