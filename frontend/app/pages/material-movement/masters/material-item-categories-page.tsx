import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Tags } from 'lucide-react';

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
  MaterialItemCategory,
  getMaterialItemCategories,
  createMaterialItemCategory,
  updateMaterialItemCategory,
  deleteMaterialItemCategory,
} from '@/lib/api/material-item-categories.api';

import {
  MaterialItemCategoryFormDialog,
  MaterialItemCategoryFormValues,
} from '@/app/pages/material-movement/masters/components/material-item-category-form-dialog';

export default function MaterialItemCategoriesPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const canEdit = canManage(roles);

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
    useState<MaterialItemCategory | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getMaterialItemCategories();

      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(
        'Failed to load material item categories:',
        err
      );

      setError(
        'Unable to load categories. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return categories;
    }

    return categories.filter((category) =>
      [category.name, category.code].some((value) =>
        value.toLowerCase().includes(q)
      )
    );
  }, [categories, search]);

  const handleSubmit = async (
    values: MaterialItemCategoryFormValues
  ) => {
    setError(null);

    const request = {
      name: values.name.trim(),
      code: values.code.trim(),
    };

    try {
      if (selected) {
        setUpdating(true);

        await updateMaterialItemCategory(selected.id, {
          ...request,
          isActive: values.status === 'Active',
        });
      } else {
        setCreating(true);

        await createMaterialItemCategory(request);
      }

      setFormOpen(false);
      setSelected(null);

      await loadCategories();
    } catch (err: any) {
      console.error(
        'Failed to save material item category:',
        err
      );

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to save category. Please try again.';

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
      await deleteMaterialItemCategory(selected.id);

      setDeleteOpen(false);
      setSelected(null);

      await loadCategories();
    } catch (err: any) {
      console.error(
        'Failed to deactivate material item category:',
        err
      );

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to deactivate category.';

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
              <Tags className="h-5 w-5" />
              Material Item Categories
            </CardTitle>

            <CardDescription>
              Categories used to group material items for
              movement and reporting.
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
              Add Category
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
              placeholder="Search categories…"
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
                <TableHead>Code</TableHead>
                <TableHead>Items</TableHead>
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
                    Loading categories…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 5 : 4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No categories found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>

                    <TableCell>{category.code}</TableCell>

                    <TableCell>{category.itemCount}</TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          category.isActive
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {category.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {canEdit ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit category"
                          onClick={() => {
                            setSelected(category);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Deactivate category"
                          disabled={!category.isActive}
                          onClick={() => {
                            setSelected(category);
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

      <MaterialItemCategoryFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
        category={selected}
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
              Deactivate category?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This will mark "{selected?.name}" as inactive.
              Items already assigned to this category will keep
              referencing it.
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
