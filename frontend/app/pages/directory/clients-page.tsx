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
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Clients</h1>
          <p className="nova-cmdbar-desc">
            External clients used for license allocation and purchase
            context.
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
              Add Client
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
              placeholder="Search clients…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filtered.length} client{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Contact</th>
                <th>License Purchases</th>
                <th>Status</th>

                {canEdit ? <th className="nova-right">Actions</th> : null}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No clients found.
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.id}>
                    <td className="font-medium">{client.name}</td>

                    <td className="nova-cell-sub">{client.code}</td>

                    <td>
                      <div className="flex flex-col text-xs">
                        <span>
                          {client.contactName ?? '—'}
                        </span>

                        <span className="nova-cell-faint">
                          {client.contactEmail ?? ''}
                        </span>

                        {client.contactPhone ? (
                          <span className="nova-cell-faint">
                            {client.contactPhone}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="nova-cell-sub">
                      {client.licensePurchaseCount}
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${client.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {client.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    {canEdit ? (
                      <td className="nova-right space-x-1">
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
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
