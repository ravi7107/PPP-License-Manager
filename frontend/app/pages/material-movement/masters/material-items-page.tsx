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
  MaterialItem,
  getMaterialItems,
  createMaterialItem,
  updateMaterialItem,
  deleteMaterialItem,
} from '@/lib/api/material-items.api';

import {
  MaterialItemCategory,
  getMaterialItemCategories,
} from '@/lib/api/material-item-categories.api';

import {
  MaterialItemFormDialog,
  MaterialItemFormValues,
} from '@/app/pages/material-movement/masters/components/material-item-form-dialog';

export default function MaterialItemsPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const canEdit = canManage(roles);

  const [items, setItems] = useState<MaterialItem[]>([]);
  const [categories, setCategories] = useState<
    MaterialItemCategory[]
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
    useState<MaterialItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [itemData, categoryData] = await Promise.all([
        getMaterialItems(),
        getMaterialItemCategories(),
      ]);

      setItems(Array.isArray(itemData) ? itemData : []);

      setCategories(
        Array.isArray(categoryData) ? categoryData : []
      );
    } catch (err) {
      console.error('Failed to load material items:', err);

      setError('Unable to load items. Please try again.');
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
      return items;
    }

    return items.filter((item) =>
      [
        item.itemCode,
        item.itemName,
        item.categoryName,
        item.materialType,
        item.unitOfMeasure ?? '',
      ].some((value) => value.toLowerCase().includes(q))
    );
  }, [items, search]);

  const handleSubmit = async (
    values: MaterialItemFormValues
  ) => {
    setError(null);

    const request = {
      itemCode: values.itemCode.trim(),
      itemName: values.itemName.trim(),
      categoryId: Number(values.categoryId),
      materialType: values.materialType,
      unitOfMeasure: values.unitOfMeasure.trim() || null,
      isSerialized: values.isSerialized,
      description: values.description.trim() || null,
    };

    try {
      if (selected) {
        setUpdating(true);

        await updateMaterialItem(selected.id, {
          ...request,
          isActive: values.status === 'Active',
        });
      } else {
        setCreating(true);

        await createMaterialItem(request);
      }

      setFormOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error('Failed to save material item:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to save item. Please try again.';

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
      await deleteMaterialItem(selected.id);

      setDeleteOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error('Failed to deactivate material item:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to deactivate item.';

      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Material Items</h1>
          <p className="nova-cmdbar-desc">
            Master list of items tracked through the material
            movement workflow.
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
              Add Item
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
              placeholder="Search items…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filtered.length} item{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Type</th>
                <th>UoM</th>
                <th>Serialized</th>
                <th>Status</th>

                {canEdit ? <th className="nova-right">Actions</th> : null}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={canEdit ? 7 : 6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading items…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 7 : 6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No items found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">
                      <div className="flex flex-col">
                        <span>{item.itemName}</span>
                        <span className="nova-cell-faint">
                          {item.itemCode}
                        </span>
                      </div>
                    </td>

                    <td className="nova-cell-sub">{item.categoryName}</td>

                    <td className="nova-cell-sub">{item.materialType}</td>

                    <td className="nova-cell-sub">
                      {item.unitOfMeasure ?? '—'}
                    </td>

                    <td className="nova-cell-sub">
                      {item.isSerialized ? 'Yes' : 'No'}
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${item.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {canEdit ? (
                      <td className="nova-right space-x-1">
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
                          disabled={!item.isActive}
                          onClick={() => {
                            setSelected(item);
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

      <MaterialItemFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
        item={selected}
        categories={categories}
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
              Deactivate item?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This will mark "{selected?.itemName}" as inactive.
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
