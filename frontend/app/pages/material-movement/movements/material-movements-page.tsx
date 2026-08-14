import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Truck } from 'lucide-react';

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

import {
  MaterialMovement,
  MaterialMovementListItem,
  SaveMaterialMovementRequest,
  createMaterialMovement,
  deleteMaterialMovement,
  getMaterialMovement,
  getMyMaterialMovements,
  updateMaterialMovement,
} from '@/lib/api/material-movements.api';

import { Company, getCompanies } from '@/lib/api/companies.api';
import {
  OfficeLocation,
  getOfficeLocations,
} from '@/lib/api/office-locations.api';
import { Department, getDepartments } from '@/lib/api/departments.api';
import {
  MaterialCostCenter,
  getMaterialCostCenters,
} from '@/lib/api/material-cost-centers.api';
import { Vendor, getVendors } from '@/lib/api/vendors.api';
import {
  MaterialItem,
  getMaterialItems,
} from '@/lib/api/material-items.api';
import { Asset, getAssets } from '@/lib/api/assets.api';

import {
  MaterialMovementFormDialog,
  MaterialMovementFormValues,
} from '@/app/pages/material-movement/movements/components/material-movement-form-dialog';

const NONE = '__none__';

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  InternalTransfer: 'Internal Transfer',
  InterEntityTransfer: 'Inter-Entity Transfer',
  OutwardToVendor: 'Outward to Vendor',
  InwardFromVendor: 'Inward from Vendor',
  TemporaryMovement: 'Temporary Movement',
  DirectInward: 'Direct Inward',
  DirectOutward: 'Direct Outward',
};

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Draft':
      return 'outline';
    case 'Rejected':
      return 'destructive';
    case 'Approved':
    case 'Completed':
      return 'default';
    default:
      return 'secondary';
  }
}

function toNullableNumber(value: string): number | null {
  return value === NONE || value.trim() === ''
    ? null
    : Number(value);
}

function toNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export default function MaterialMovementsPage() {
  const [movements, setMovements] = useState<
    MaterialMovementListItem[]
  >([]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [officeLocations, setOfficeLocations] = useState<
    OfficeLocation[]
  >([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [costCenters, setCostCenters] = useState<
    MaterialCostCenter[]
  >([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingMovement, setEditingMovement] =
    useState<MaterialMovement | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<MaterialMovementListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);

    try {
      const data = await getMyMaterialMovements();
      setMovements(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setListError(
        err?.response?.data?.message ??
          err?.message ??
          'Failed to load movements.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();

    void getCompanies()
      .then(setCompanies)
      .catch(() => setCompanies([]));

    void getOfficeLocations()
      .then(setOfficeLocations)
      .catch(() => setOfficeLocations([]));

    void getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));

    void getMaterialCostCenters()
      .then(setCostCenters)
      .catch(() => setCostCenters([]));

    void getVendors()
      .then(setVendors)
      .catch(() => setVendors([]));

    void getMaterialItems()
      .then(setItems)
      .catch(() => setItems([]));

    void getAssets()
      .then(setAssets)
      .catch(() => setAssets([]));
  }, [loadList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return movements;
    }

    return movements.filter((movement) =>
      [
        movement.movementNumber ?? '',
        MOVEMENT_TYPE_LABELS[movement.movementType] ??
          movement.movementType,
        movement.fromSummary ?? '',
        movement.toSummary ?? '',
      ].some((value) => value.toLowerCase().includes(q))
    );
  }, [movements, search]);

  const openCreate = () => {
    setEditingMovement(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = async (row: MaterialMovementListItem) => {
    setPageError(null);

    try {
      const full = await getMaterialMovement(row.id);
      setEditingMovement(full);
      setFormError(null);
      setFormOpen(true);
    } catch (err: any) {
      setPageError(
        err?.response?.data?.message ??
          'Failed to load movement.'
      );
    }
  };

  const handleFormSubmit = async (
    values: MaterialMovementFormValues
  ) => {
    setSaving(true);
    setFormError(null);

    const request: SaveMaterialMovementRequest = {
      movementType: values.movementType,

      fromCompanyId: toNullableNumber(values.fromCompanyId),
      fromLocationId: toNullableNumber(values.fromLocationId),
      fromDepartmentId: toNullableNumber(values.fromDepartmentId),
      fromCostCenterId: toNullableNumber(values.fromCostCenterId),

      toCompanyId: toNullableNumber(values.toCompanyId),
      toLocationId: toNullableNumber(values.toLocationId),
      toDepartmentId: toNullableNumber(values.toDepartmentId),
      toCostCenterId: toNullableNumber(values.toCostCenterId),

      vendorId: toNullableNumber(values.vendorId),

      expectedReturnDate: toNullableText(values.expectedReturnDate),
      purpose: toNullableText(values.purpose),

      items: values.items.map((item) => ({
        itemId: Number(item.itemId),
        assetId: toNullableNumber(item.assetId),
        quantity: item.quantity,
        unitOfMeasure: toNullableText(item.unitOfMeasure),
        serialNumbers: toNullableText(item.serialNumbers),
        condition: toNullableText(item.condition),
        remarks: toNullableText(item.remarks),
      })),
    };

    try {
      if (editingMovement) {
        await updateMaterialMovement(editingMovement.id, request);
      } else {
        await createMaterialMovement(request);
      }

      setFormOpen(false);
      setEditingMovement(null);

      await loadList();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message ??
          err?.message ??
          'Failed to save movement draft.'
      );
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (row: MaterialMovementListItem) => {
    setPageError(null);
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setPageError(null);

    try {
      await deleteMaterialMovement(deleteTarget.id);

      setDeleteOpen(false);
      setDeleteTarget(null);

      await loadList();
    } catch (err: any) {
      setPageError(
        err?.response?.data?.message ??
          'Failed to delete movement draft.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Material Movements
          </h2>
          <p className="text-sm text-muted-foreground">
            Create and manage material movement drafts. Submitting
            a draft for approval comes in a later update.
          </p>
        </div>

        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Movement
        </Button>
      </div>

      {pageError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {pageError}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              My Movements
            </CardTitle>

            <CardDescription>
              Movements you have raised.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {listError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {listError}
            </div>
          ) : null}

          <Input
            placeholder="Search by movement number, type, from, or to…"
            className="sm:max-w-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Movement #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading movements…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No movements found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-mono text-xs">
                      {movement.movementNumber ?? '—'}
                    </TableCell>

                    <TableCell>
                      {MOVEMENT_TYPE_LABELS[movement.movementType] ??
                        movement.movementType}
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusVariant(movement.status)}>
                        {movement.status}
                      </Badge>
                    </TableCell>

                    <TableCell>{movement.fromSummary ?? '—'}</TableCell>
                    <TableCell>{movement.toSummary ?? '—'}</TableCell>
                    <TableCell>{movement.itemCount}</TableCell>
                    <TableCell>
                      {movement.createdAt.slice(0, 10)}
                    </TableCell>

                    <TableCell className="space-x-1 text-right">
                      {movement.status === 'Draft' ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(movement)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />{' '}
                            Edit
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              openDeleteConfirm(movement)
                            }
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" />{' '}
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MaterialMovementFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setEditingMovement(null);
          }
        }}
        movement={editingMovement}
        companies={companies}
        officeLocations={officeLocations}
        departments={departments}
        costCenters={costCenters}
        vendors={vendors}
        items={items}
        assets={assets}
        saving={saving}
        error={formError}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);

          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft?</AlertDialogTitle>

            <AlertDialogDescription>
              This will permanently delete this movement draft.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
