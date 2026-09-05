import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, QrCode, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { AppRole, canManage } from '@/lib/auth/roles';

import {
  InventoryCategory,
  InventoryItem,
  getInventoryItems,
  getInventoryCategories,
  createInventoryItem,
  updateInventoryItem,
  deactivateInventoryItem,
  getInventoryItemQrSvg,
  downloadInventoryItemLabelPdf,
  downloadInventoryLabelSheet,
} from '@/lib/api/inventory.api';

import { Company, getCompanies } from '@/lib/api/companies.api';
import { Department, getDepartments } from '@/lib/api/departments.api';
import {
  OfficeLocation,
  getOfficeLocations,
} from '@/lib/api/office-locations.api';
import { Vendor, getVendors } from '@/lib/api/vendors.api';
import { Asset, getAssets } from '@/lib/api/assets.api';
import {
  PurchaseRequisitionAvailableLine,
  getAvailablePurchaseRequisitionLines,
} from '@/lib/api/purchase-requisitions.api';

import {
  InventoryFormDialog,
  InventoryFormValues,
} from '@/app/pages/inventory/components/inventory-form-dialog';

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function InventoryPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const canEdit = canManage(roles);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prLines, setPrLines] = useState<PurchaseRequisitionAvailableLine[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');

  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const loadLookups = async () => {
    try {
      const [cats, comps, depts, locs, vends, assts] = await Promise.all([
        getInventoryCategories(),
        getCompanies(),
        getDepartments(),
        getOfficeLocations(),
        getVendors(),
        getAssets(),
      ]);

      setCategories(Array.isArray(cats) ? cats : []);
      setCompanies(Array.isArray(comps) ? comps : []);
      setDepartments(Array.isArray(depts) ? depts : []);
      setLocations(Array.isArray(locs) ? locs : []);
      setVendors(Array.isArray(vends) ? vends : []);
      setAssets(Array.isArray(assts) ? assts : []);
    } catch (err) {
      console.error('Failed to load Inventory lookups:', err);
    }

    try {
      const lines = await getAvailablePurchaseRequisitionLines();
      setPrLines(Array.isArray(lines) ? lines : []);
    } catch (err) {
      console.error('Failed to load available PR lines:', err);
      setPrLines([]);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getInventoryItems({
        page,
        pageSize,
        categoryId: categoryFilter === 'all' ? null : Number(categoryFilter),
        search: search || undefined,
      });

      setItems(Array.isArray(result.items) ? result.items : []);
      setTotalRecords(result.totalRecords ?? 0);
    } catch (err) {
      console.error('Failed to load Inventory items:', err);
      setError('Unable to load inventory items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLookups();
  }, []);

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, categoryFilter]);

  // Debounce search - reload after the user stops typing, same pattern
  // as this app's other server-paginated lists.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      void loadItems();
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalRecords / pageSize)),
    [totalRecords]
  );

  const handleSubmit = async (values: InventoryFormValues) => {
    setError(null);

    const shared = {
      itemName: values.itemName.trim(),
      description: values.description.trim() || null,
      serialNumber: values.serialNumber.trim() || null,
      categoryId: Number(values.categoryId),
      locationId: values.locationId ? Number(values.locationId) : null,
      departmentId: values.departmentId ? Number(values.departmentId) : null,
      assetId: values.assetId ? Number(values.assetId) : null,
      purchaseRequisitionLineItemId: values.purchaseRequisitionLineItemId
        ? Number(values.purchaseRequisitionLineItemId)
        : null,
      purchaseCost: values.purchaseCost ? Number(values.purchaseCost) : null,
      vendorId: values.vendorId ? Number(values.vendorId) : null,
      remarks: values.remarks.trim() || null,
    };

    try {
      if (selected) {
        setUpdating(true);

        await updateInventoryItem(selected.id, {
          ...shared,
          isActive: selected.isActive,
        });
      } else {
        setCreating(true);

        await createInventoryItem({
          ...shared,
          companyId: Number(values.companyId),
        });
      }

      setFormOpen(false);
      setSelected(null);

      await loadItems();
    } catch (err: any) {
      console.error('Failed to save inventory item:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to save inventory item. Please try again.';

      setError(message);
    } finally {
      setCreating(false);
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;

    setDeleting(true);
    setError(null);

    try {
      await deactivateInventoryItem(selected.id);

      setDeleteOpen(false);
      setSelected(null);

      await loadItems();
    } catch (err: any) {
      console.error('Failed to deactivate inventory item:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to deactivate inventory item.';

      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleShowQr = async (item: InventoryItem) => {
    try {
      const svg = await getInventoryItemQrSvg(item.id);
      setQrSvg(svg);
      setSelected(item);
      setQrOpen(true);
    } catch (err) {
      console.error('Failed to load QR code:', err);
      setError('Unable to load QR code for this item.');
    }
  };

  const handleDownloadLabel = async (item: InventoryItem) => {
    try {
      const { blob, fileName } = await downloadInventoryItemLabelPdf(
        item.id,
        item.inventoryTag
      );
      triggerDownload(blob, fileName);
    } catch (err) {
      console.error('Failed to download label:', err);
      setError('Unable to download label for this item.');
    }
  };

  const handleDownloadLabelSheet = async () => {
    if (selectedIds.length === 0) return;

    try {
      const blob = await downloadInventoryLabelSheet(selectedIds);
      triggerDownload(blob, 'inventory-label-sheet.pdf');
    } catch (err) {
      console.error('Failed to download label sheet:', err);
      setError('Unable to download the label sheet.');
    }
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Inventory</h1>
          <p className="nova-cmdbar-desc">
            One register for IT, Facility, HR, and every other department's
            physical inventory - each item gets a printable QR label.
          </p>
        </div>

        <div className="nova-cmdbar-actions flex gap-2">
          {selectedIds.length > 0 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadLabelSheet}
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Print {selectedIds.length} label
              {selectedIds.length === 1 ? '' : 's'}
            </Button>
          ) : null}

          {canEdit ? (
            <Button
              size="sm"
              onClick={() => {
                setSelected(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Item
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="nova-panel">
        <div className="nova-panel-toolbar flex flex-wrap gap-2">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by tag, name, serial…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {totalRecords} item{totalRecords === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Tag</th>
                <th>Item</th>
                <th>Category</th>
                <th>Entity</th>
                <th>Location</th>
                <th>Linked Asset</th>
                <th>PR / PO</th>
                <th>Status</th>
                <th className="nova-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                    Loading inventory…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelected(item.id)}
                      />
                    </td>

                    <td className="font-medium">{item.inventoryTag}</td>

                    <td>
                      {item.itemName}
                      {item.serialNumber ? (
                        <div className="nova-cell-sub">
                          S/N: {item.serialNumber}
                        </div>
                      ) : null}
                    </td>

                    <td className="nova-cell-sub">{item.categoryName}</td>
                    <td className="nova-cell-sub">{item.companyName}</td>
                    <td className="nova-cell-sub">
                      {item.locationName ?? '—'}
                    </td>
                    <td className="nova-cell-sub">
                      {item.assetTag ?? '—'}
                    </td>
                    <td className="nova-cell-sub">
                      {item.prNumber
                        ? `${item.prNumber}${item.poNumber ? ` / ${item.poNumber}` : ''}`
                        : '—'}
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${item.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="nova-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Show QR"
                        onClick={() => handleShowQr(item)}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download label"
                        onClick={() => handleDownloadLabel(item)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>

                      {canEdit ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit item"
                            onClick={() => {
                              setSelected(item);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Deactivate item"
                            onClick={() => {
                              setSelected(item);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

        {totalPages > 1 ? (
          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>

      <InventoryFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setSelected(null);
        }}
        item={selected}
        saving={creating || updating}
        categories={categories}
        companies={companies}
        departments={departments}
        locations={locations}
        vendors={vendors}
        assets={assets}
        purchaseRequisitionLines={prLines}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate inventory item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark "{selected?.itemName}" ({selected?.inventoryTag})
              as inactive. Its QR label will no longer resolve to an active
              item.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{selected?.inventoryTag}</DialogTitle>
          </DialogHeader>
          <div
            className="flex justify-center p-4"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
