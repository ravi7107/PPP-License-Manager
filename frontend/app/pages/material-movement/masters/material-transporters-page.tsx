import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Truck } from 'lucide-react';

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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Material Transporters
            </CardTitle>

            <CardDescription>
              Third-party carriers available for material
              dispatch.
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
              Add Transporter
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
              placeholder="Search transporters…"
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
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Vehicle Details</TableHead>
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
                    colSpan={canEdit ? 5 : 4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading transporters…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 5 : 4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No transporters found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((transporter) => (
                  <TableRow key={transporter.id}>
                    <TableCell className="font-medium">
                      {transporter.name}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>
                          {transporter.contactName ?? '—'}
                        </span>

                        <span className="text-muted-foreground">
                          {transporter.contactEmail ?? ''}
                        </span>

                        {transporter.contactPhone ? (
                          <span className="text-muted-foreground">
                            {transporter.contactPhone}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="max-w-xs truncate">
                      {transporter.vehicleDetails ?? '—'}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          transporter.isActive
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {transporter.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {canEdit ? (
                      <TableCell className="text-right">
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
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
