import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
import { Plus, Search, Download, Upload, Pencil, Trash2, Eye, History, ArrowUpDown, ArrowRightLeft, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppRole, canManage } from '@/lib/auth/roles';
import loadAssets from '@/actions/assets/loadAssets';
import { loadUsers, loadDepartments, loadCompanies, loadClients } from '@/actions/assets/loadAssetLookups';
import createAsset from '@/actions/assets/createAsset';
import updateAsset from '@/actions/assets/updateAsset';
import deleteAsset from '@/actions/assets/deleteAsset';
import { recordAssetAudit } from '@/actions/assets/auditLog';
// Hardware ownership lifecycle is managed through AssetAssignment API.
import { AssetFormDialog } from '@/app/pages/hardware/components/asset-form-dialog';
import { AssetViewDialog } from '@/app/pages/hardware/components/asset-view-dialog';
import { AssetDeleteDialog } from '@/app/pages/hardware/components/asset-delete-dialog';
import { AssetAuditHistoryDialog } from '@/app/pages/hardware/components/asset-audit-history-dialog';
import { AssetTransferDialog, AssetTransferFormValues } from '@/app/pages/hardware/components/asset-transfer-dialog';
import { AssetImportDialog } from '@/app/pages/hardware/components/asset-import-dialog';
import { AssetRecord, AssetFormValues, LookupOption } from '@/app/pages/hardware/types';
import { exportAssetsToExcel } from '@/lib/utils/asset-excel';
import { ImportedAssetRow } from '@/lib/utils/asset-excel';

import {
  AssetAssignment,
  getCurrentAssetAssignments,
  assignAsset,
  transferAsset,
  returnAsset as returnAssetAssignment,
} from '@/lib/api/asset-assignments.api';

type SortKey = 'asset_tag' | 'computer_name' | 'purchase_date' | 'warranty_expiry' | 'status';

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Assigned':
      return 'default';
    case 'Maintenance':
      return 'secondary';
    case 'Scrap':
      return 'destructive';
    default:
      return 'outline';
  }
}

export default function HardwarePage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const user = useUser();
  const canEdit = canManage(roles);

  const [assets, loading, , reload]: [AssetRecord[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadAssets,
    [],
    {},
  );
const [users]: [LookupOption[], boolean, Error | null, () => Promise<void>] =
  useLoadAction(loadUsers, [], {});

const [departments]: [LookupOption[], boolean, Error | null, () => Promise<void>] =
  useLoadAction(loadDepartments, [], {});

const [companies]: [LookupOption[], boolean, Error | null, () => Promise<void>] =
  useLoadAction(loadCompanies, [], {});

const [clients]: [LookupOption[], boolean, Error | null, () => Promise<void>] =
  useLoadAction(loadClients, [], {});

  // Current hardware assignments are loaded from the
  // AssetAssignments table, which is the source of truth
  // for hardware-to-user ownership.
  const [currentAssignments, setCurrentAssignments] =
    useState<AssetAssignment[]>([]);

  const [assignmentsLoading, setAssignmentsLoading] =
    useState(true);

  const loadCurrentAssignments = async () => {
    try {
      setAssignmentsLoading(true);

      const result =
        await getCurrentAssetAssignments();

      setCurrentAssignments(result);
    } catch (error) {
      console.error(
        'Unable to load current hardware assignments:',
        error
      );

      setCurrentAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    void loadCurrentAssignments();
  }, []);

  const [saveAsset, saving] = useMutateAction(createAsset);
  const [editAsset, updating] = useMutateAction(updateAsset);
  const [removeAsset, deleting] = useMutateAction(deleteAsset);
  const [logAudit] = useMutateAction(recordAssetAudit);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('asset_tag');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);

  const actorName = user?.name ?? 'System';

  const isTeamLeader = roles.includes('Team Leader') && !canEdit;
  const myDepartmentId = useMemo(() => {
    if (!isTeamLeader) return null;
    const matchedUser = (users as unknown as Array<{ id: number; full_name: string; department_id?: number }>).find(
      (u) => u.full_name?.toLowerCase() === (user?.name ?? '').toLowerCase(),
    );
    return matchedUser?.department_id ?? null;
  }, [isTeamLeader, users, user?.name]);

  // Normalize API lookup responses before rendering.
  // This prevents a malformed/non-array API response from
  // crashing the Hardware page.
  
const safeDepartments = Array.isArray(departments)
  ? departments
  : [];

const safeUsers = Array.isArray(users)
  ? users
  : [];

const safeCompanies = Array.isArray(companies)
  ? companies
  : [];

const safeClients = Array.isArray(clients)
  ? clients
  : [];
  const assetsWithAssignments = useMemo(() => {
    const assignmentByAssetId = new Map(
      currentAssignments.map((assignment) => [
        assignment.assetId,
        assignment,
      ])
    );

    const safeAssets = Array.isArray(assets)
      ? assets
      : [];

    return safeAssets.map((asset) => {
      const assignment =
        assignmentByAssetId.get(asset.id);

      if (!assignment) {
        return {
          ...asset,
          assigned_user_id: null,
          assigned_user_name: null,
          current_assignment_id: null,
        };
      }

      return {
        ...asset,

        assigned_user_id:
          assignment.userId,

        assigned_user_name:
          assignment.userName,

        department_id:
          assignment.departmentId ??
          asset.department_id,

        department_name:
          assignment.departmentName ??
          asset.department_name,

        current_assignment_id:
          assignment.id,

        status: 'Assigned',
      };
    });
  }, [assets, currentAssignments]);

  const filteredAssets = useMemo(() => {
    let list = [...assetsWithAssignments];

    if (isTeamLeader && myDepartmentId) {
      list = list.filter((a) => a.department_id === myDepartmentId);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) =>
        [a.asset_tag, a.computer_name, a.host_name, a.serial_number, a.assigned_user_name, a.model]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q)),
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (departmentFilter !== 'all') {
      list = list.filter((a) => String(a.department_id) === departmentFilter);
    }

    list.sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [
    assetsWithAssignments,
    search,
    statusFilter,
    departmentFilter,
    sortKey,
    sortDir,
    isTeamLeader,
    myDepartmentId,
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const openAdd = () => {
    setSelectedAsset(null);
    setFormOpen(true);
  };

  const openEdit = (asset: AssetRecord) => {
    setSelectedAsset(asset);
    setFormOpen(true);
  };

  const openView = (asset: AssetRecord) => {
    setSelectedAsset(asset);
    setViewOpen(true);
  };

  const openDelete = (asset: AssetRecord) => {
    setSelectedAsset(asset);
    setDeleteOpen(true);
  };

  const openHistory = (asset: AssetRecord) => {
    setSelectedAsset(asset);
    setHistoryOpen(true);
  };

  const openTransfer = (asset: AssetRecord) => {
    setSelectedAsset(asset);
    setTransferOpen(true);
  };

  const handleTransfer = async (
    values: AssetTransferFormValues
  ) => {
    if (!selectedAsset) return;

    // AssetAssignment currently represents
    // hardware-to-user ownership.
    if (values.allocationType !== 'User') {
      throw new Error(
        'The new Hardware Assignment workflow currently supports user assignments only.'
      );
    }

    if (!values.userId) {
      throw new Error('Please select a user.');
    }

    const newUserId = Number(values.userId);

    if (!Number.isFinite(newUserId)) {
      throw new Error('Invalid user selection.');
    }

    const currentAssignment =
      currentAssignments.find(
        (assignment) =>
          assignment.assetId === selectedAsset.id
      );

    if (currentAssignment) {
      // Existing hardware owner -> transfer.
      await transferAsset(
        currentAssignment.id,
        {
          newUserId,
          remarks:
            values.notes ||
            'Transferred via Hardware page',
        }
      );
    } else {
      // Available hardware -> first assignment.
      await assignAsset({
        assetId: selectedAsset.id,
        userId: newUserId,
        remarks:
          values.notes ||
          'Assigned via Hardware page',
      });
    }

    await logAudit({
      recordId: selectedAsset.id,
      action: currentAssignment
        ? 'TRANSFER'
        : 'ASSIGN',
      oldValues: JSON.stringify({
        assignmentId:
          currentAssignment?.id ?? null,
        userId:
          currentAssignment?.userId ?? null,
      }),
      newValues: JSON.stringify({
        userId: newUserId,
      }),
      actorName,
    });

    setTransferOpen(false);

    await Promise.all([
      reload(),
      loadCurrentAssignments(),
    ]);
  };

  const handleReturn = async (
    asset: AssetRecord
  ) => {
    const currentAssignment =
      currentAssignments.find(
        (assignment) =>
          assignment.assetId === asset.id
      );

    if (!currentAssignment) {
      throw new Error(
        'No active hardware assignment was found for this asset.'
      );
    }

    await returnAssetAssignment(
      currentAssignment.id,
      {
        remarks:
          'Returned via Hardware page',
      }
    );

    await logAudit({
      recordId: asset.id,
      action: 'RETURN',
      oldValues: JSON.stringify({
        assignmentId:
          currentAssignment.id,
        userId:
          currentAssignment.userId,
      }),
      newValues: JSON.stringify({
        assignmentId: null,
        userId: null,
      }),
      actorName,
    });

    await Promise.all([
      reload(),
      loadCurrentAssignments(),
    ]);
  };

const handleSubmit = async (values: AssetFormValues) => {
  const payload = {
    assetTag: values.assetTag,
    assetName: values.assetName,
    assetType: values.assetType,

    manufacturer: values.manufacturer || null,
    model: values.model || null,
    serialNumber: values.serialNumber || null,

    hostName: values.hostName || null,

    processor: values.processor || null,
    ramGb: values.ramGb ?? null,

    storageGb: null,
    graphicsCard: null,

    operatingSystem: values.operatingSystem || null,

    departmentId: values.departmentId
      ? Number(values.departmentId)
      : 0,

    purchaseDate: values.purchaseDate || null,
    warrantyExpiry: values.warrantyExpiry || null,

    remarks: values.remarks || null,
  };

  if (selectedAsset) {
    await editAsset({
      ...payload,
      id: selectedAsset.id,
      status: selectedAsset.status,
      isReadyForAssignment:
        selectedAsset.isReadyForAssignment,
      isActive: selectedAsset.isActive,
    });

    await logAudit({
      recordId: selectedAsset.id,
      action: "UPDATE",
      oldValues: JSON.stringify(selectedAsset),
      newValues: JSON.stringify(payload),
      actorName,
    });
  } else {
    await saveAsset(payload);

    await logAudit({
      recordId: null,
      action: "INSERT",
      oldValues: null,
      newValues: JSON.stringify(payload),
      actorName,
    });
  }

  setFormOpen(false);
  await reload();
};

  const handleDelete = async () => {
    if (!selectedAsset) return;
    await removeAsset({ id: selectedAsset.id, actorName });
    await logAudit({
      recordId: selectedAsset.id,
      action: 'DELETE',
      oldValues: JSON.stringify(selectedAsset),
      newValues: null,
      actorName,
    });
    setDeleteOpen(false);
    await reload();
  };

  const handleImport = async (rows: ImportedAssetRow[]) => {
    for (const row of rows) {
      await saveAsset({
        assetTag: row.assetTag,
        assetType: 'Workstation',
        computerName: row.computerName || null,
        hostName: row.hostName || null,
        serialNumber: row.serialNumber || null,
        manufacturer: row.manufacturer || null,
        model: row.model || null,
        purchaseDate: row.purchaseDate || null,
        warrantyExpiry: row.warrantyExpiry || null,
        operatingSystem: row.operatingSystem || null,
        location: row.location || null,
        status: row.status || 'Available',
        remarks: null,
        assignedUserId: null,
        departmentId: null,
        entityId: null,
        clientId: null,
        actorName,
      });
    }
    await logAudit({
      recordId: null,
      action: 'INSERT',
      oldValues: null,
      newValues: JSON.stringify({ importedCount: rows.length }),
      actorName,
    });
    setImportOpen(false);
    await reload();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Asset Inventory</CardTitle>
            <CardDescription>Track hardware assets, ownership, warranty and lifecycle status.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportAssetsToExcel(filteredAssets)}>
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
                  Add Asset
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
                placeholder="Search by asset ID, computer, serial, user…"
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
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Scrap">Scrap</SelectItem>
              </SelectContent>
            </Select>
            {!isTeamLeader ? (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {(Array.isArray(departments)
                      ? departments
                      : []
                    ).map((d: LookupOption) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <span className="text-sm text-muted-foreground">{filteredAssets.length} asset(s)</span>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('asset_tag')}>
                    <span className="inline-flex items-center gap-1">
                      Asset ID <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('computer_name')}>
                    <span className="inline-flex items-center gap-1">
                      Computer Name <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Manufacturer / Model</TableHead>
                  <TableHead>Current User</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('warranty_expiry')}>
                    <span className="inline-flex items-center gap-1">
                      Warranty Expiry <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    <span className="inline-flex items-center gap-1">
                      Status <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || assignmentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Loading assets…
                    </TableCell>
                  </TableRow>
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No assets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.asset_tag}</TableCell>
                      <TableCell>{asset.computer_name ?? '—'}</TableCell>
                      <TableCell>{asset.serial_number ?? '—'}</TableCell>
                      <TableCell>
                        {asset.manufacturer ?? '—'} {asset.model ? `/ ${asset.model}` : ''}
                      </TableCell>
                      <TableCell>{asset.assigned_user_name ?? 'Unassigned'}</TableCell>
                      <TableCell>{asset.department_name ?? '—'}</TableCell>
                      <TableCell>{asset.warranty_expiry?.slice(0, 10) ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(asset.status)}>{asset.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(asset)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openHistory(asset)}>
                              <History className="mr-2 h-4 w-4" /> Audit History
                            </DropdownMenuItem>
                            {canEdit ? (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(asset)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openTransfer(asset)}>
                                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                                  {asset.current_assignment_id ? 'Transfer' : 'Assign'}
                                </DropdownMenuItem>
                                {asset.current_assignment_id ? (
                                  <DropdownMenuItem onClick={() => handleReturn(asset)}>
                                    <Undo2 className="mr-2 h-4 w-4" /> Return
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem className="text-destructive" onClick={() => openDelete(asset)}>
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

      <AssetFormDialog
  open={formOpen}
  onOpenChange={setFormOpen}
  asset={selectedAsset}
  users={safeUsers}
  departments={safeDepartments}
  entities={safeCompanies}
  clients={safeClients}
  saving={updating}
  onSubmit={handleSubmit}
/>
      <AssetViewDialog open={viewOpen} onOpenChange={setViewOpen} asset={selectedAsset} />
      <AssetDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        asset={selectedAsset}
        deleting={deleting}
        onConfirm={handleDelete}
      />
      <AssetAuditHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} asset={selectedAsset} />
      <AssetImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        importing={saving}
        onImport={handleImport}
      />
     <AssetTransferDialog
  open={transferOpen}
  onOpenChange={setTransferOpen}
  asset={selectedAsset}
  users={safeUsers}
  entities={safeCompanies}
  clients={safeClients}
  saving={updating}
  onSubmit={handleTransfer}
/>
    </div>
  );
}
