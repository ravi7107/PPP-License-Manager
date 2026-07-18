import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
import { Plus, Search, Pencil, Trash2, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import loadEntitiesFull from '@/actions/directory/loadEntities';
import createEntity from '@/actions/directory/createEntity';
import updateEntity from '@/actions/directory/updateEntity';
import deleteEntity from '@/actions/directory/deleteEntity';
import { EntityFormDialog, EntityFormValues } from '@/app/pages/directory/components/entity-form-dialog';
import { EntityRecord } from '@/app/pages/directory/types';

export default function EntitiesPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const user = useUser();
  const canEdit = canManage(roles);
  const actorName = user?.name ?? 'System';

  const [entities, loading, , reload]: [EntityRecord[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadEntitiesFull,
    [],
    {},
  );

  const [createEnt, creating] = useMutateAction(createEntity);
  const [editEnt, updating] = useMutateAction(updateEntity);
  const [removeEnt, deleting] = useMutateAction(deleteEntity);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<EntityRecord | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return entities;
    const q = search.trim().toLowerCase();
    return entities.filter((e) => [e.name, e.code].some((f) => f.toLowerCase().includes(q)));
  }, [entities, search]);

  const handleSubmit = async (values: EntityFormValues) => {
    if (selected) {
      await editEnt({ id: selected.id, ...values, address: values.address || null, actorName });
    } else {
      await createEnt({ ...values, address: values.address || null, actorName });
    }
    setFormOpen(false);
    await reload();
  };

  const handleDelete = async () => {
    if (!selected) return;
    await removeEnt({ id: selected.id, actorName });
    setDeleteOpen(false);
    await reload();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" /> Entities
            </CardTitle>
            <CardDescription>Legal entities used for hardware ownership and allocation.</CardDescription>
          </div>
          {canEdit ? (
            <Button
              size="sm"
              onClick={() => {
                setSelected(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Entity
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search entities…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead>Status</TableHead>
                {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No entities found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.code}</TableCell>
                    <TableCell className="max-w-xs truncate">{e.address ?? '—'}</TableCell>
                    <TableCell>{e.asset_count}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === 'Active' ? 'default' : 'secondary'}>{e.status}</Badge>
                    </TableCell>
                    {canEdit ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelected(e);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelected(e);
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

      <EntityFormDialog open={formOpen} onOpenChange={setFormOpen} entity={selected} saving={creating || updating} onSubmit={handleSubmit} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entity?</AlertDialogTitle>
            <AlertDialogDescription>This will soft-delete "{selected?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
