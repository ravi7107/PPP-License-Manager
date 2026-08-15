import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';

import { AppRole, canManage } from '@/lib/auth/roles';

import {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  createCompany,
  deleteCompany,
  getCompanies,
  updateCompany,
} from '@/lib/api/companies.api';

import {
  EntityFormDialog,
  EntityFormValues,
} from '@/app/pages/directory/components/entity-form-dialog';

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

function optionalValue(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}

export default function EntitiesPage() {
  const { roles } = useOutletContext<{
    roles: AppRole[];
  }>();

  const manageable = canManage(roles);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Company | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getCompanies();

      setCompanies(Array.isArray(result) ? result : []);
    } catch (err) {
      setCompanies([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return companies;
    }

    return companies.filter((company) => {
      return [
        company.name,
        company.code,
        company.gstNumber,
        company.address,
        company.contactPerson,
        company.contactEmail,
        company.contactPhone,
      ].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(query)
      );
    });
  }, [companies, search]);

  const activeCount = useMemo(
    () => companies.filter((company) => company.isActive).length,
    [companies]
  );

  const inactiveCount = companies.length - activeCount;

  function openCreate() {
    setSelected(null);
    setFormOpen(true);
  }

  function openEdit(company: Company) {
    setSelected(company);
    setFormOpen(true);
  }

  async function handleSubmit(values: EntityFormValues) {
    try {
      setSaving(true);
      setError(null);

      if (selected) {
        const request: UpdateCompanyRequest = {
          name: values.name.trim(),
          code: optionalValue(values.code),
          gstNumber: optionalValue(values.gstNumber),
          address: optionalValue(values.address),
          contactPerson: optionalValue(values.contactPerson),
          contactEmail: optionalValue(values.contactEmail),
          contactPhone: optionalValue(values.contactPhone),
          isActive: values.status === 'Active',
        };

        await updateCompany(selected.id, request);
      } else {
        const request: CreateCompanyRequest = {
          name: values.name.trim(),
          code: optionalValue(values.code),
          gstNumber: optionalValue(values.gstNumber),
          address: optionalValue(values.address),
          contactPerson: optionalValue(values.contactPerson),
          contactEmail: optionalValue(values.contactEmail),
          contactPhone: optionalValue(values.contactPhone),
        };

        await createCompany(request);
      }

      setFormOpen(false);
      setSelected(null);

      await loadCompanies();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setError(null);

      await deleteCompany(deleteTarget.id);

      setDeleteTarget(null);

      await loadCompanies();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Entities</h1>
          <p className="nova-cmdbar-desc">
            Manage legal entities and companies used across assets,
            departments, and software licensing.
          </p>
        </div>

        {manageable ? (
          <div className="nova-cmdbar-actions">
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Entity
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="nova-kpi-grid">
        <div className="nova-kpi-card">
          <div className="nova-kpi-top">
            <span className="nova-kpi-label">Total Entities</span>
            <div
              className="nova-kpi-icon"
              style={{ background: 'var(--nova-blue-50)' }}
            >
              <Building2
                className="text-[var(--nova-blue-500)]"
                strokeWidth={2}
              />
            </div>
          </div>
          <div className="nova-kpi-value">
            {loading ? '—' : companies.length}
          </div>
        </div>

        <div className="nova-kpi-card">
          <div className="nova-kpi-top">
            <span className="nova-kpi-label">Active Entities</span>
            <div
              className="nova-kpi-icon"
              style={{ background: 'var(--nova-teal-50)' }}
            >
              <CheckCircle2
                className="text-[var(--nova-teal-500)]"
                strokeWidth={2}
              />
            </div>
          </div>
          <div className="nova-kpi-value">
            {loading ? '—' : activeCount}
          </div>
        </div>

        <div className="nova-kpi-card">
          <div className="nova-kpi-top">
            <span className="nova-kpi-label">Inactive Entities</span>
            <div
              className="nova-kpi-icon"
              style={{ background: 'var(--nova-slate-100)' }}
            >
              <XCircle
                className="text-[var(--nova-slate-500)]"
                strokeWidth={2}
              />
            </div>
          </div>
          <div className="nova-kpi-value">
            {loading ? '—' : inactiveCount}
          </div>
        </div>
      </div>

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search entities…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filteredCompanies.length} entit
            {filteredCompanies.length === 1 ? 'y' : 'ies'}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={loading}
            onClick={() => void loadCompanies()}
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entity</th>
                <th>Code</th>
                <th>GST Number</th>
                <th>Contact</th>
                <th>Status</th>

                {manageable ? (
                  <th className="nova-right">Actions</th>
                ) : null}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={manageable ? 6 : 5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading entities…
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td
                    colSpan={manageable ? 6 : 5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    {search.trim()
                      ? 'No entities match your search.'
                      : 'No entities found. Add the first entity to get started.'}
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <div className="font-medium">{company.name}</div>

                      <div className="nova-cell-faint max-w-xs truncate">
                        {company.address || 'No address'}
                      </div>
                    </td>

                    <td className="nova-cell-sub">
                      {company.code || '—'}
                    </td>

                    <td className="nova-cell-sub">
                      {company.gstNumber || '—'}
                    </td>

                    <td>
                      <div className="flex flex-col text-xs">
                        <span>{company.contactPerson || '—'}</span>

                        {company.contactEmail ? (
                          <span className="nova-cell-faint">
                            {company.contactEmail}
                          </span>
                        ) : null}

                        {company.contactPhone ? (
                          <span className="nova-cell-faint">
                            {company.contactPhone}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${company.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {company.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {manageable ? (
                      <td className="nova-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit entity"
                          onClick={() => openEdit(company)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Deactivate entity"
                          disabled={!company.isActive}
                          onClick={() => setDeleteTarget(company)}
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

      <EntityFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
        entity={selected}
        saving={saving}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate entity?</AlertDialogTitle>

            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.name} will be marked inactive. Existing records will remain in the database.`
                : 'This entity will be marked inactive.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
