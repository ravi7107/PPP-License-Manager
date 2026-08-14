import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Wallet } from 'lucide-react';

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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Material Cost Centers
            </CardTitle>

            <CardDescription>
              Cost centers used to attribute material movement
              costs, optionally scoped to a legal entity.
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
              Add Cost Center
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
              placeholder="Search cost centers…"
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
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Entity</TableHead>
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
                    Loading cost centers…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 5 : 4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No cost centers found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((costCenter) => (
                  <TableRow key={costCenter.id}>
                    <TableCell className="font-medium">
                      {costCenter.code}
                    </TableCell>

                    <TableCell>{costCenter.name}</TableCell>

                    <TableCell>
                      {costCenter.companyName ?? 'Shared'}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          costCenter.isActive
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {costCenter.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {canEdit ? (
                      <TableCell className="text-right">
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
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
