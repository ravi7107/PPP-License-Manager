import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pencil,
  Plus,
  Trash2,
  Search,
  FileEdit,
  Clock,
  CheckCircle2,
  Layers,
} from 'lucide-react';

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

// Status: Draft, Submitted, PendingApproval, Approved, Dispatched,
// InTransit, Received, Completed, Rejected, Cancelled,
// TemporaryReturnPending, TemporaryReturned - must match
// MaterialMovement.Status (backend Models/MaterialMovement.cs).
function humanizeStatus(status: string): string {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function statusPillClass(status: string): string {
  switch (status) {
    case 'Draft':
      return 'nova-pill-neutral';
    case 'Submitted':
    case 'PendingApproval':
      return 'nova-pill-pending';
    case 'Approved':
    case 'Dispatched':
    case 'InTransit':
    case 'Received':
    case 'TemporaryReturnPending':
      return 'nova-pill-info';
    case 'Completed':
    case 'TemporaryReturned':
      return 'nova-pill-success';
    case 'Rejected':
    case 'Cancelled':
      return 'nova-pill-danger';
    default:
      return 'nova-pill-neutral';
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

  // Derived from the already-loaded list - no extra API calls. Kept to
  // counts the list endpoint can actually support today; a true "Overdue
  // Returns" tile would need expectedReturnDate, which /mine doesn't
  // return per row, so it's left out rather than guessed at.
  const kpis = useMemo(() => {
    let draft = 0;
    let pending = 0;
    let completed = 0;

    for (const movement of movements) {
      if (movement.status === 'Draft') draft += 1;
      else if (
        movement.status === 'Submitted' ||
        movement.status === 'PendingApproval'
      )
        pending += 1;
      else if (
        movement.status === 'Completed' ||
        movement.status === 'TemporaryReturned'
      )
        completed += 1;
    }

    return { draft, pending, completed, total: movements.length };
  }, [movements]);

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
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Material Movements</h1>
          <p className="nova-cmdbar-desc">
            Create and manage material movement drafts. Submitting a
            draft for approval comes in a later update.
          </p>
        </div>

        <div className="nova-cmdbar-actions">
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Movement
          </Button>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {pageError}
        </div>
      ) : null}

      {listError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {listError}
        </div>
      ) : null}

      <div className="nova-kpi-grid">
        <div className="nova-kpi-card">
          <div className="nova-kpi-top">
            <span className="nova-kpi-label">Draft</span>
            <div
              className="nova-kpi-icon"
              style={{ background: 'var(--nova-slate-100)' }}
            >
              <FileEdit
                className="text-[var(--nova-slate-500)]"
                strokeWidth={2}
              />
            </div>
          </div>
          <div className="nova-kpi-value">{kpis.draft}</div>
        </div>

        <div className="nova-kpi-card">
          <div className="nova-kpi-top">
            <span className="nova-kpi-label">Pending Approval</span>
            <div
              className="nova-kpi-icon"
              style={{ background: 'var(--nova-amber-50)' }}
            >
              <Clock
                className="text-[var(--nova-amber-500)]"
                strokeWidth={2}
              />
            </div>
          </div>
          <div className="nova-kpi-value">{kpis.pending}</div>
        </div>

        <div className="nova-kpi-card">
          <div className="nova-kpi-top">
            <span className="nova-kpi-label">Completed</span>
            <div
              className="nova-kpi-icon"
              style={{ background: 'var(--nova-teal-50)' }}
            >
              <CheckCircle2
                className="text-[var(--nova-teal-500)]"
                strokeWidth={2}
              />
            </div>
          </div>
          <div className="nova-kpi-value">{kpis.completed}</div>
        </div>

        <div className="nova-kpi-card">
          <div className="nova-kpi-top">
            <span className="nova-kpi-label">Total Movements</span>
            <div
              className="nova-kpi-icon"
              style={{ background: 'var(--nova-blue-50)' }}
            >
              <Layers
                className="text-[var(--nova-blue-500)]"
                strokeWidth={2}
              />
            </div>
          </div>
          <div className="nova-kpi-value">{kpis.total}</div>
        </div>
      </div>

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by movement number, type, from, or to…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filtered.length} movement{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Movement #</th>
                <th>Type</th>
                <th>Status</th>
                <th>From</th>
                <th>To</th>
                <th>Items</th>
                <th>Created</th>
                <th className="nova-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading movements…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No movements found.
                  </td>
                </tr>
              ) : (
                filtered.map((movement) => (
                  <tr key={movement.id}>
                    <td className="nova-mono">
                      {movement.movementNumber ?? '—'}
                    </td>

                    <td>
                      {MOVEMENT_TYPE_LABELS[movement.movementType] ??
                        movement.movementType}
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${statusPillClass(movement.status)}`}
                      >
                        <span className="nova-dot" />
                        {humanizeStatus(movement.status)}
                      </span>
                    </td>

                    <td className="nova-cell-sub">
                      {movement.fromSummary ?? '—'}
                    </td>
                    <td className="nova-cell-sub">
                      {movement.toSummary ?? '—'}
                    </td>
                    <td>{movement.itemCount}</td>
                    <td className="nova-cell-faint">
                      {movement.createdAt.slice(0, 10)}
                    </td>

                    <td className="nova-right space-x-1">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
