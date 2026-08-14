import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';

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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Material Items
            </CardTitle>

            <CardDescription>
              Master list of items tracked through the material
              movement workflow.
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
              Add Item
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
              placeholder="Search items…"
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
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead>Serialized</TableHead>
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
                    colSpan={canEdit ? 7 : 6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading items…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 7 : 6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{item.itemName}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.itemCode}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>{item.categoryName}</TableCell>

                    <TableCell>{item.materialType}</TableCell>

                    <TableCell>
                      {item.unitOfMeasure ?? '—'}
                    </TableCell>

                    <TableCell>
                      {item.isSerialized ? 'Yes' : 'No'}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          item.isActive ? 'default' : 'secondary'
                        }
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {canEdit ? (
                      <TableCell className="text-right">
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
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
