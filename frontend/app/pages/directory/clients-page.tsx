import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Briefcase,
} from 'lucide-react';

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
  Client,
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from '@/lib/api/clients.api';

import {
  ClientFormDialog,
  ClientFormValues,
} from '@/app/pages/directory/components/client-form-dialog';

export default function ClientsPage() {
  const { roles } =
    useOutletContext<{ roles: AppRole[] }>();

  const canEdit = canManage(roles);

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selected, setSelected] =
    useState<Client | null>(null);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getClients();

      setClients(data);
    } catch (err) {
      console.error('Unable to load clients:', err);

      setError('Unable to load clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return clients;
    }

    const q = search.trim().toLowerCase();

    return clients.filter((client) =>
      [
        client.name,
        client.code,
        client.contactName ?? '',
        client.contactEmail ?? '',
        client.contactPhone ?? '',
        client.address ?? '',
      ].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [clients, search]);

  const handleSubmit = async (
    values: ClientFormValues
  ) => {
    try {
      setError(null);

      const commonPayload = {
        name: values.name.trim(),
        code: values.code.trim(),
        contactName:
          values.contactName.trim() || null,
        contactEmail:
          values.contactEmail.trim() || null,
        contactPhone:
          values.contactPhone.trim() || null,
        address:
          values.address.trim() || null,
      };

      if (selected) {
        setUpdating(true);

        await updateClient(selected.id, {
          ...commonPayload,
          isActive: values.status === 'Active',
        });
      } else {
        setCreating(true);

        await createClient(commonPayload);
      }

      setFormOpen(false);
      setSelected(null);

      await loadClients();
    } catch (err) {
      console.error('Unable to save client:', err);

      setError('Unable to save client.');
    } finally {
      setCreating(false);
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      await deleteClient(selected.id);

      setDeleteOpen(false);
      setSelected(null);

      await loadClients();
    } catch (err) {
      console.error('Unable to deactivate client:', err);

      setError('Unable to deactivate client.');
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
              <Briefcase className="h-5 w-5" />
              Clients
            </CardTitle>

            <CardDescription>
              External clients used for license allocation
              and purchase context.
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
              Add Client
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

            <Input
              placeholder="Search clients…"
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
                <TableHead>Contact</TableHead>
                <TableHead>License Purchases</TableHead>
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
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No clients found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.name}
                    </TableCell>

                    <TableCell>
                      {client.code}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>
                          {client.contactName ?? '—'}
                        </span>

                        <span className="text-muted-foreground">
                          {client.contactEmail ?? ''}
                        </span>

                        {client.contactPhone ? (
                          <span className="text-muted-foreground">
                            {client.contactPhone}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell>
                      {client.licensePurchaseCount}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          client.isActive
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {client.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {canEdit ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelected(client);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!client.isActive}
                          onClick={() => {
                            setSelected(client);
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

      <ClientFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
        client={selected}
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
              Deactivate client?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This will deactivate "{selected?.name}".
              Historical license purchase records will remain
              intact.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting
                ? 'Deactivating…'
                : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
