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
  Vendor,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
} from '@/lib/api/vendors.api';

import {
  VendorFormDialog,
  VendorFormValues,
} from '@/app/pages/directory/components/vendor-form-dialog';

export default function VendorsPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const canEdit = canManage(roles);

  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selected, setSelected] = useState<Vendor | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getVendors();

      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load vendors:', err);

      setError('Unable to load vendors. Please try again.');
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
      return vendors;
    }

    return vendors.filter((vendor) =>
      [
        vendor.vendorName,
        vendor.vendorCode,
        vendor.contactPerson ?? '',
        vendor.email ?? '',
      ].some((value) => value.toLowerCase().includes(q))
    );
  }, [vendors, search]);

  const handleSubmit = async (values: VendorFormValues) => {
    setError(null);

    const request = {
      vendorCode: values.vendorCode.trim(),
      vendorName: values.vendorName.trim(),
      contactPerson: values.contactPerson.trim() || null,
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      address: values.address.trim() || null,
      isActive: values.status === 'Active',
    };

    try {
      if (selected) {
        setUpdating(true);

        await updateVendor(selected.id, request);
      } else {
        setCreating(true);

        await createVendor(request);
      }

      setFormOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error('Failed to save vendor:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to save vendor. Please try again.';

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
      await deleteVendor(selected.id);

      setDeleteOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error('Failed to deactivate vendor:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to deactivate vendor.';

      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Vendors</h1>
          <p className="nova-cmdbar-desc">
            Vendors selectable on purchase requisitions - shown on the
            generated PR PDF.
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
              Add Vendor
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
              placeholder="Search vendors…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filtered.length} vendor{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Code</th>
                <th>Contact</th>
                <th>Email</th>
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
                    Loading vendors…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No vendors found.
                  </td>
                </tr>
              ) : (
                filtered.map((vendor) => (
                  <tr key={vendor.id}>
                    <td className="font-medium">{vendor.vendorName}</td>

                    <td className="nova-cell-sub">{vendor.vendorCode}</td>

                    <td className="nova-cell-sub">
                      {vendor.contactPerson ?? '—'}
                    </td>

                    <td className="nova-cell-sub">
                      {vendor.email ?? '—'}
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${vendor.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {canEdit ? (
                      <td className="nova-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit vendor"
                          onClick={() => {
                            setSelected(vendor);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Deactivate vendor"
                          onClick={() => {
                            setSelected(vendor);
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

      <VendorFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
        vendor={selected}
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
            <AlertDialogTitle>Deactivate vendor?</AlertDialogTitle>

            <AlertDialogDescription>
              This will mark "{selected?.vendorName}" as inactive. It will
              no longer be selectable on new purchase requisitions, but
              existing requisitions that already reference it are
              unaffected.
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
