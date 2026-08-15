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
  MaterialCostCenter,
  getMaterialCostCenters,
  createMaterialCostCenter,
  updateMaterialCostCenter,
  deleteMaterialCostCenter,
} from '@/lib/api/material-cost-centers.api';

import { Company, getCompanies } from '@/lib/api/companies.api';

import {
  MaterialCostCenterFormDialog,
  MaterialCostCenterFormValues,
} from '@/app/pages/material-movement/masters/components/material-cost-center-form-dialog';

const NO_COMPANY = '__none__';

export default function MaterialCostCentersPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const canEdit = canManage(roles);

  const [costCenters, setCostCenters] = useState<
    MaterialCostCenter[]
  >([]);

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
    useState<MaterialCostCenter | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [costCenterData, companyData] = await Promise.all([
        getMaterialCostCenters(),
        getCompanies(),
      ]);

      setCostCenters(
        Array.isArray(costCenterData) ? costCenterData : []
      );

      setCompanies(
        Array.isArray(companyData) ? companyData : []
      );
    } catch (err) {
      console.error('Failed to load cost centers:', err);

      setError(
        'Unable to load cost centers. Please try again.'
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
      return costCenters;
    }

    return costCenters.filter((costCenter) =>
      [
        costCenter.code,
        costCenter.name,
        costCenter.companyName ?? '',
      ].some((value) => value.toLowerCase().includes(q))
    );
  }, [costCenters, search]);

  const handleSubmit = async (
    values: MaterialCostCenterFormValues
  ) => {
    setError(null);

    const request = {
      code: values.code.trim(),
      name: values.name.trim(),
      companyId:
        values.companyId === NO_COMPANY
          ? null
          : Number(values.companyId),
    };

    try {
      if (selected) {
        setUpdating(true);

        await updateMaterialCostCenter(selected.id, {
          ...request,
          isActive: values.status === 'Active',
        });
      } else {
        setCreating(true);

        await createMaterialCostCenter(request);
      }

      setFormOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error('Failed to save cost center:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to save cost center. Please try again.';

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
      await deleteMaterialCostCenter(selected.id);

      setDeleteOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error('Failed to deactivate cost center:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to deactivate cost center.';

      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Material Cost Centers</h1>
          <p className="nova-cmdbar-desc">
            Cost centers used to attribute material movement costs,
            optionally scoped to a legal entity.
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
              Add Cost Center
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
              placeholder="Search cost centers…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filtered.length} cost center{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Entity</th>
                <th>Status</th>

                {canEdit ? <th className="nova-right">Actions</th> : null}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={canEdit ? 5 : 4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading cost centers…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 5 : 4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No cost centers found.
                  </td>
                </tr>
              ) : (
                filtered.map((costCenter) => (
                  <tr key={costCenter.id}>
                    <td className="nova-mono">{costCenter.code}</td>

                    <td>{costCenter.name}</td>

                    <td className="nova-cell-sub">
                      {costCenter.companyName ?? 'Shared'}
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${costCenter.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {costCenter.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    {canEdit ? (
                      <td className="nova-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit cost center"
                          onClick={() => {
                            setSelected(costCenter);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Deactivate cost center"
                          disabled={!costCenter.isActive}
                          onClick={() => {
                            setSelected(costCenter);
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

      <MaterialCostCenterFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
        costCenter={selected}
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
              Deactivate cost center?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This will mark "{selected?.name}" as inactive.
              Historical movement records will remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
