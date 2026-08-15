import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Departments</h1>
          <p className="nova-cmdbar-desc">
            Organizational departments mapped to PPS legal entities.
          </p>
        </div>

        {canEdit ? (
          <div className="nova-cmdbar-actions">
            <Button
              size="sm"
              onClick={() => {
                setSelected(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Department
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search departments…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filtered.length} department{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Code</th>
                <th>Entity</th>
                <th>Description</th>
                <th>Status</th>

                {canEdit ? <th className="nova-right">Actions</th> : null}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading departments…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No departments found.
                  </td>
                </tr>
              ) : (
                filtered.map((department) => (
                  <tr key={department.id}>
                    <td className="font-medium">
                      {department.departmentName}
                    </td>

                    <td className="nova-cell-sub">
                      {department.departmentCode}
                    </td>

                    <td className="nova-cell-sub">
                      {department.companyName || '—'}
                    </td>

                    <td className="max-w-xs truncate nova-cell-sub">
                      {department.description ?? '—'}
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${department.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {department.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    {canEdit ? (
                      <td className="nova-right space-x-1">
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
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
