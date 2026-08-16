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
  PurchaseRequisitionContact,
  getPurchaseRequisitionContacts,
  createPurchaseRequisitionContact,
  updatePurchaseRequisitionContact,
  deletePurchaseRequisitionContact,
} from '@/lib/api/purchase-requisition-contacts.api';

import { Company, getCompanies } from '@/lib/api/companies.api';

import {
  PurchaseRequisitionContactFormDialog,
  PurchaseRequisitionContactFormValues,
} from '@/app/pages/directory/components/purchase-requisition-contact-form-dialog';

function roleLabel(contactType: string): string {
  switch (contactType) {
    case 'Initiator':
      return 'Initiator';
    case 'Approver':
      return 'Approver';
    case 'Both':
      return 'Initiator + Approver';
    default:
      return contactType;
  }
}

export default function PurchaseRequisitionContactsPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const canEdit = canManage(roles);

  const [contacts, setContacts] = useState<PurchaseRequisitionContact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selected, setSelected] =
    useState<PurchaseRequisitionContact | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [contactData, companyData] = await Promise.all([
        getPurchaseRequisitionContacts(),
        getCompanies(),
      ]);

      setContacts(Array.isArray(contactData) ? contactData : []);
      setCompanies(Array.isArray(companyData) ? companyData : []);
    } catch (err) {
      console.error('Failed to load purchase requisition contacts:', err);

      setError('Unable to load contacts. Please try again.');
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
      return contacts;
    }

    return contacts.filter((contact) =>
      [
        contact.fullName,
        contact.email,
        contact.companyName ?? '',
        contact.contactType,
      ].some((value) => value.toLowerCase().includes(q))
    );
  }, [contacts, search]);

  const handleSubmit = async (
    values: PurchaseRequisitionContactFormValues
  ) => {
    setError(null);

    const request = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      contactType: values.contactType,
      companyId: values.companyId ? Number(values.companyId) : null,
    };

    try {
      if (selected) {
        setUpdating(true);

        await updatePurchaseRequisitionContact(selected.id, {
          ...request,
          isActive: values.status === 'Active',
        });
      } else {
        setCreating(true);

        await createPurchaseRequisitionContact(request);
      }

      setFormOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error('Failed to save contact:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to save contact. Please try again.';

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
      await deletePurchaseRequisitionContact(selected.id);

      setDeleteOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error('Failed to deactivate contact:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to deactivate contact.';

      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Purchase Requisition Contacts</h1>
          <p className="nova-cmdbar-desc">
            External initiators and approvers (Gmail/Office 365 addresses)
            who don't have a login of their own - used when submitting a
            purchase requisition for approval.
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
              Add Contact
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
              placeholder="Search contacts…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filtered.length} contact{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Entity</th>
                <th>Status</th>

                {canEdit ? <th className="nova-right">Actions</th> : null}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading contacts…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No contacts found.
                  </td>
                </tr>
              ) : (
                filtered.map((contact) => (
                  <tr key={contact.id}>
                    <td className="font-medium">{contact.fullName}</td>

                    <td className="nova-cell-sub">{contact.email}</td>

                    <td className="nova-cell-sub">
                      {roleLabel(contact.contactType)}
                    </td>

                    <td className="nova-cell-sub">
                      {contact.companyName || 'Org-wide'}
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${contact.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {contact.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {canEdit ? (
                      <td className="nova-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit contact"
                          onClick={() => {
                            setSelected(contact);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Deactivate contact"
                          onClick={() => {
                            setSelected(contact);
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

      <PurchaseRequisitionContactFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
        contact={selected}
        companies={companies}
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
            <AlertDialogTitle>Deactivate contact?</AlertDialogTitle>

            <AlertDialogDescription>
              This will mark "{selected?.fullName}" as inactive. They will
              no longer appear as an available initiator/approver, but
              existing purchase requisitions they're already assigned to
              are unaffected.
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
    </div>
  );
}
