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
  MaterialTransporter,
  getMaterialTransporters,
  createMaterialTransporter,
  updateMaterialTransporter,
  deleteMaterialTransporter,
} from '@/lib/api/material-transporters.api';

import {
  MaterialTransporterFormDialog,
  MaterialTransporterFormValues,
} from '@/app/pages/material-movement/masters/components/material-transporter-form-dialog';

export default function MaterialTransportersPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const canEdit = canManage(roles);

  const [transporters, setTransporters] = useState<
    MaterialTransporter[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selected, setSelected] =
    useState<MaterialTransporter | null>(null);

  const loadTransporters = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getMaterialTransporters();

      setTransporters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load transporters:', err);

      setError(
        'Unable to load transporters. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTransporters();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return transporters;
    }

    return transporters.filter((transporter) =>
      [
        transporter.name,
        transporter.contactName ?? '',
        transporter.contactPhone ?? '',
        transporter.contactEmail ?? '',
        transporter.vehicleDetails ?? '',
      ].some((value) => value.toLowerCase().includes(q))
    );
  }, [transporters, search]);

  const handleSubmit = async (
    values: MaterialTransporterFormValues
  ) => {
    setError(null);

    const request = {
      name: values.name.trim(),
      contactName: values.contactName.trim() || null,
      contactPhone: values.contactPhone.trim() || null,
      contactEmail: values.contactEmail.trim() || null,
      vehicleDetails: values.vehicleDetails.trim() || null,
    };

    try {
      if (selected) {
        setUpdating(true);

        await updateMaterialTransporter(selected.id, {
          ...request,
          isActive: values.status === 'Active',
        });
      } else {
        setCreating(true);

        await createMaterialTransporter(request);
      }

      setFormOpen(false);
      setSelected(null);

      await loadTransporters();
    } catch (err: any) {
      console.error('Failed to save transporter:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to save transporter. Please try again.';

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
      await deleteMaterialTransporter(selected.id);

      setDeleteOpen(false);
      setSelected(null);

      await loadTransporters();
    } catch (err: any) {
      console.error('Failed to deactivate transporter:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to deactivate transporter.';

      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Material Transporters</h1>
          <p className="nova-cmdbar-desc">
            Third-party carriers available for material dispatch.
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
              Add Transporter
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
              placeholder="Search transporters…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filtered.length} transporter{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Vehicle Details</th>
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
                    Loading transporters…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 5 : 4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No transporters found.
                  </td>
                </tr>
              ) : (
                filtered.map((transporter) => (
                  <tr key={transporter.id}>
                    <td className="font-medium">{transporter.name}</td>

                    <td>
                      <div className="flex flex-col text-xs">
                        <span>
                          {transporter.contactName ?? '—'}
                        </span>

                        <span className="nova-cell-faint">
                          {transporter.contactEmail ?? ''}
                        </span>

                        {transporter.contactPhone ? (
                          <span className="nova-cell-faint">
                            {transporter.contactPhone}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="max-w-xs truncate nova-cell-sub">
                      {transporter.vehicleDetails ?? '—'}
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${transporter.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {transporter.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    {canEdit ? (
                      <td className="nova-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit transporter"
                          onClick={() => {
                            setSelected(transporter);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Deactivate transporter"
                          disabled={!transporter.isActive}
                          onClick={() => {
                            setSelected(transporter);
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

      <MaterialTransporterFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
        transporter={selected}
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
              Deactivate transporter?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This will mark "{selected?.name}" as inactive.
              Historical dispatch records will remain intact.
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
