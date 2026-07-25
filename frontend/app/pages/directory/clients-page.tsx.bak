import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
import { Plus, Search, Pencil, Trash2, Briefcase } from 'lucide-react';
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
import loadClientsFull from '@/actions/directory/loadClients';
import createClient from '@/actions/directory/createClient';
import updateClient from '@/actions/directory/updateClient';
import deleteClient from '@/actions/directory/deleteClient';
import { ClientFormDialog, ClientFormValues } from '@/app/pages/directory/components/client-form-dialog';
import { ClientRecord } from '@/app/pages/directory/types';

export default function ClientsPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const user = useUser();
  const canEdit = canManage(roles);
  const actorName = user?.name ?? 'System';

  const [clients, loading, , reload]: [ClientRecord[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadClientsFull,
    [],
    {},
  );

  const [createCl, creating] = useMutateAction(createClient);
  const [editCl, updating] = useMutateAction(updateClient);
  const [removeCl, deleting] = useMutateAction(deleteClient);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ClientRecord | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.trim().toLowerCase();
    return clients.filter((c) => [c.name, c.code, c.contact_name ?? ''].some((f) => f.toLowerCase().includes(q)));
  }, [clients, search]);

  const handleSubmit = async (values: ClientFormValues) => {
    const payload = {
      name: values.name,
      code: values.code,
      contactName: values.contactName || null,
      contactEmail: values.contactEmail || null,
      contactPhone: values.contactPhone || null,
      status: values.status,
      actorName,
    };
    if (selected) {
      await editCl({ id: selected.id, ...payload });
    } else {
      await createCl(payload);
    }
    setFormOpen(false);
    await reload();
  };

  const handleDelete = async () => {
    if (!selected) return;
    await removeCl({ id: selected.id, actorName });
    setDeleteOpen(false);
    await reload();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" /> Clients
            </CardTitle>
            <CardDescription>External clients used for hardware allocation context.</CardDescription>
          </div>
          {canEdit ? (
            <Button
              size="sm"
              onClick={() => {
                setSelected(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Contact</TableHead>
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
                    No clients found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.code}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>{c.contact_name ?? '—'}</span>
                        <span className="text-muted-foreground">{c.contact_email ?? ''}</span>
                      </div>
                    </TableCell>
                    <TableCell>{c.asset_count}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'Active' ? 'default' : 'secondary'}>{c.status}</Badge>
                    </TableCell>
                    {canEdit ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelected(c);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelected(c);
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

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={selected} saving={creating || updating} onSubmit={handleSubmit} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
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
