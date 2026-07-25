import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
import { Plus, Search, Pencil, Trash2, Eye, KeySquare, PackageCheck, PackageOpen, DollarSign, AlertTriangle, Wrench, Gauge, Download, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { KpiCard } from '@/components/layout/kpi-card';
import { AppRole, canManage } from '@/lib/auth/roles';
import loadSoftwareInventory from '@/actions/software/loadSoftwareInventory';
import loadSoftwareStats from '@/actions/software/loadSoftwareStats';
import loadEntityOptions from '@/actions/lookups/loadEntityOptions';
import loadClientOptions from '@/actions/lookups/loadClientOptions';
import createSoftwareInventory from '@/actions/software/createSoftwareInventory';
import updateSoftwareInventory from '@/actions/software/updateSoftwareInventory';
import deleteSoftwareInventory from '@/actions/software/deleteSoftwareInventory';
import { SoftwareFormDialog } from '@/app/pages/licenses/components/software-form-dialog';
import { SoftwareViewDialog } from '@/app/pages/licenses/components/software-view-dialog';
import { SoftwareDeleteDialog } from '@/app/pages/licenses/components/software-delete-dialog';
import { SoftwareImportDialog } from '@/app/pages/licenses/components/software-import-dialog';
import { SoftwareFormValues, SoftwareInventoryRecord, SoftwareStats } from '@/app/pages/licenses/types';
import { exportSoftwareToExcel, ImportedSoftwareRow } from '@/lib/utils/software-excel';

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Active':
      return 'default';
    case 'Expired':
      return 'destructive';
    default:
      return 'outline';
  }
}

const EMPTY_STATS: SoftwareStats = {
  total_titles: 0,
  total_licenses: 0,
  used_licenses: 0,
  available_licenses: 0,
  total_cost: 0,
  expiring_soon: 0,
  maintenance_expiring_soon: 0,
  avg_cost_per_license: 0,
  utilization_pct: 0,
};

export default function LicensesPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const user = useUser();
  const canEdit = canManage(roles);
  const actorName = user?.name ?? 'System';

  const [records, loading, , reload]: [SoftwareInventoryRecord[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(loadSoftwareInventory, [], {});
  const [statsRows]: [SoftwareStats[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadSoftwareStats,
    [],
    {},
  );
  const stats = statsRows[0] ?? EMPTY_STATS;

  const [entityOptions]: [{ id: number; name: string }[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(loadEntityOptions, [], {});
  const [clientOptions]: [{ id: number; name: string }[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(loadClientOptions, [], {});

  const [saveSoftware, saving] = useMutateAction(createSoftwareInventory);
  const [editSoftware, updating] = useMutateAction(updateSoftwareInventory);
  const [removeSoftware, deleting] = useMutateAction(deleteSoftwareInventory);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [licenseTypeFilter, setLicenseTypeFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<SoftwareInventoryRecord | null>(null);

  const filtered = useMemo(() => {
    let list = [...records];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        [r.software_name, r.vendor, r.version, r.associated_assets, r.associated_users]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q)),
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (licenseTypeFilter !== 'all') {
      list = list.filter((r) => r.license_type === licenseTypeFilter);
    }

    if (entityFilter !== 'all') {
      list = list.filter((r) => String(r.entity_id ?? '') === entityFilter);
    }

    if (clientFilter !== 'all') {
      list = list.filter((r) => String(r.client_id ?? '') === clientFilter);
    }

    return list;
  }, [records, search, statusFilter, licenseTypeFilter, entityFilter, clientFilter]);

  const openAdd = () => {
    setSelected(null);
    setFormOpen(true);
  };

  const openEdit = (record: SoftwareInventoryRecord) => {
    setSelected(record);
    setFormOpen(true);
  };

  const openView = (record: SoftwareInventoryRecord) => {
    setSelected(record);
    setViewOpen(true);
  };

  const openDelete = (record: SoftwareInventoryRecord) => {
    setSelected(record);
    setDeleteOpen(true);
  };

  const handleSubmit = async (values: SoftwareFormValues) => {
    const payload = {
      softwareName: values.softwareName,
      vendor: values.vendor,
      version: values.version || null,
      licenseType: values.licenseType,
      licenseCount: values.licenseCount,
      costPerLicense: values.costPerLicense,
      expiryDate: values.expiryDate || null,
      maintenanceExpiry: values.maintenanceExpiry || null,
      status: values.status,
      entityId: values.entityId || null,
      departmentId: values.departmentId || null,
      clientId: values.clientId || null,
      actorName,
    };

    if (selected) {
      await editSoftware({ ...payload, id: selected.id, softwareId: selected.software_id });
    } else {
      await saveSoftware(payload);
    }
    setFormOpen(false);
    await reload();
  };

  const handleDelete = async () => {
    if (!selected) return;
    await removeSoftware({ id: selected.id, actorName });
    setDeleteOpen(false);
    await reload();
  };

  const handleImport = async (rows: ImportedSoftwareRow[]) => {
    for (const row of rows) {
      await saveSoftware({
        softwareName: row.softwareName,
        vendor: row.vendor || 'Unknown',
        version: row.version || null,
        licenseType: (row.licenseType as SoftwareFormValues['licenseType']) || 'Subscription',
        licenseCount: row.licenseCount || '0',
        costPerLicense: row.costPerLicense || '0',
        expiryDate: row.expiryDate || null,
        maintenanceExpiry: row.maintenanceExpiry || null,
        status: (row.status as SoftwareFormValues['status']) || 'Active',
        entityId: null,
        departmentId: null,
        clientId: null,
        actorName,
      });
    }
    setImportOpen(false);
    await reload();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Software Titles" value={stats.total_titles} icon={KeySquare} hint="Distinct software tracked" />
        <KpiCard title="Total Licenses" value={stats.total_licenses} icon={PackageCheck} hint="Seats across all software" />
        <KpiCard
          title="Available Licenses"
          value={stats.available_licenses}
          icon={PackageOpen}
          hint="Unassigned seats in pool"
        />
        <KpiCard
          title="Total License Cost"
          value={`$${Number(stats.total_cost).toLocaleString()}`}
          icon={DollarSign}
          hint="Sum of license count × cost/license"
        />
        <KpiCard
          title="Used Licenses"
          value={stats.used_licenses}
          icon={PackageCheck}
          hint="Currently allocated seats"
        />
        <KpiCard
          title="Expiring Soon"
          value={stats.expiring_soon}
          icon={AlertTriangle}
          tone="warning"
          hint="License expiry within 30 days"
        />
        <KpiCard
          title="Maintenance Expiring"
          value={stats.maintenance_expiring_soon}
          icon={Wrench}
          tone="warning"
          hint="Maintenance expiry within 30 days"
        />
        <KpiCard
          title="Cost Per License"
          value={`$${Number(stats.avg_cost_per_license).toLocaleString()}`}
          icon={DollarSign}
          hint="Average cost per seat across all software"
        />
        <KpiCard
          title="Utilization"
          value={`${Number(stats.utilization_pct)}%`}
          icon={Gauge}
          hint="Seats used vs. total purchased"
          tone={Number(stats.utilization_pct) < 60 ? 'warning' : 'default'}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Software Inventory</CardTitle>
            <CardDescription>Manage software titles, license pools, cost and expiry.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportSoftwareToExcel(filtered)}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            {canEdit ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Excel
                </Button>
                <Button size="sm" onClick={openAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Software
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by software, vendor, asset, user…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={licenseTypeFilter} onValueChange={setLicenseTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="License Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All License Types</SelectItem>
                <SelectItem value="Perpetual">Perpetual</SelectItem>
                <SelectItem value="Subscription">Subscription</SelectItem>
                <SelectItem value="Floating">Floating</SelectItem>
                <SelectItem value="Node-locked">Node-locked</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityOptions.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clientOptions.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{filtered.length} title(s)</span>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Software</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>License Type</TableHead>
                  <TableHead>Allocation</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Used / Available</TableHead>
                  <TableHead>Cost / License</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                      Loading software inventory…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                      No software found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.software_name}</TableCell>
                      <TableCell>{record.vendor}</TableCell>
                      <TableCell>{record.version ?? '—'}</TableCell>
                      <TableCell>{record.license_type}</TableCell>
                      <TableCell className="text-xs">
                        {[record.entity_name, record.department_name, record.client_name].filter(Boolean).join(' · ') || '—'}
                      </TableCell>
                      <TableCell>{record.license_count}</TableCell>
                      <TableCell>
                        {record.used_licenses} / {record.available_licenses}
                      </TableCell>
                      <TableCell>${Number(record.cost_per_license).toFixed(2)}</TableCell>
                      <TableCell>{record.expiry_date?.slice(0, 10) ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(record)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            {canEdit ? (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(record)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => openDelete(record)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Retire / Delete
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SoftwareFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={selected}
        saving={saving || updating}
        onSubmit={handleSubmit}
      />
      <SoftwareViewDialog open={viewOpen} onOpenChange={setViewOpen} record={selected} />
      <SoftwareDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        record={selected}
        deleting={deleting}
        onConfirm={handleDelete}
      />
      <SoftwareImportDialog open={importOpen} onOpenChange={setImportOpen} importing={saving} onImport={handleImport} />
    </div>
  );
}
