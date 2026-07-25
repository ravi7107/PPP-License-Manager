import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Building2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
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
import { Badge } from '@/components/ui/badge';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />

            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              Entities
            </h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage legal entities and companies used across assets,
            departments, and software licensing.
          </p>
        </div>

        {manageable && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entity
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Entities</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? '—' : companies.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Entities</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? '—' : activeCount}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive Entities</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? '—' : inactiveCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                Entity Directory
              </CardTitle>

              <CardDescription>
                Company master records stored in the PPS License Manager.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search entities..."
                  className="pl-9"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={loading}
                onClick={() => void loadCompanies()}
                title="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading ? 'animate-spin' : ''
                  }`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>

                  {manageable && (
                    <TableHead className="w-12 text-right">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell
                      colSpan={manageable ? 6 : 5}
                      className="h-28 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading entities...
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!loading && filteredCompanies.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={manageable ? 6 : 5}
                      className="h-28 text-center text-sm text-muted-foreground"
                    >
                      {search.trim()
                        ? 'No entities match your search.'
                        : 'No entities found. Add the first entity to get started.'}
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="font-medium">
                          {company.name}
                        </div>

                        <div className="max-w-xs truncate text-xs text-muted-foreground">
                          {company.address || 'No address'}
                        </div>
                      </TableCell>

                      <TableCell>
                        {company.code || '—'}
                      </TableCell>

                      <TableCell>
                        {company.gstNumber || '—'}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {company.contactPerson || '—'}
                        </div>

                        {company.contactEmail && (
                          <div className="text-xs text-muted-foreground">
                            {company.contactEmail}
                          </div>
                        )}

                        {company.contactPhone && (
                          <div className="text-xs text-muted-foreground">
                            {company.contactPhone}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            company.isActive
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {company.isActive
                            ? 'Active'
                            : 'Inactive'}
                        </Badge>
                      </TableCell>

                      {manageable && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">
                                  Open actions
                                </span>
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEdit(company)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>

                              {company.isActive && (
                                <>
                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      setDeleteTarget(company)
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
            <AlertDialogTitle>
              Deactivate entity?
            </AlertDialogTitle>

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
