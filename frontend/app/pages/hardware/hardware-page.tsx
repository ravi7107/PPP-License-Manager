import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';

import {
  Plus,
  Search,
  Download,
  Upload,
  Pencil,
  Trash2,
  Eye,
  History,
  ArrowUpDown,
  ArrowRightLeft,
  Undo2,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { AppRole, canManage } from '@/lib/auth/roles';

import loadAssets from '@/actions/assets/loadAssets';

import {
  loadUsers,
  loadDepartments,
  loadCompanies,
  loadClients,
} from '@/actions/assets/loadAssetLookups';

import createAsset from '@/actions/assets/createAsset';
import updateAsset from '@/actions/assets/updateAsset';
import deleteAsset from '@/actions/assets/deleteAsset';
import { recordAssetAudit } from '@/actions/assets/auditLog';

import recordAssetAllocation from '@/actions/assets/recordAssetAllocation';
import returnAssetAllocation from '@/actions/assets/returnAssetAllocation';

import { AssetFormDialog } from '@/app/pages/hardware/components/asset-form-dialog';
import { AssetViewDialog } from '@/app/pages/hardware/components/asset-view-dialog';
import { AssetDeleteDialog } from '@/app/pages/hardware/components/asset-delete-dialog';
import {
  AssetAuditHistoryDialog,
} from '@/app/pages/hardware/components/asset-audit-history-dialog';

import {
  AssetTransferDialog,
  AssetTransferFormValues,
} from '@/app/pages/hardware/components/asset-transfer-dialog';

import { AssetImportDialog } from '@/app/pages/hardware/components/asset-import-dialog';

import {
  AssetRecord,
  AssetFormValues,
  LookupOption,
} from '@/app/pages/hardware/types';

import { exportAssetsToExcel } from '@/lib/utils/asset-excel';
import { ImportedAssetRow } from '@/lib/utils/asset-excel';

import {
  AssetAssignment,
  getCurrentAssetAssignments,
} from '@/lib/api/asset-assignments.api';

type SortKey =
  | 'asset_tag'
  | 'computer_name'
  | 'purchase_date'
  | 'warranty_expiry'
  | 'status';

type ExtendedLookupOption = LookupOption & {
  fullName?: string;
  email?: string;
  employeeCode?: string;
  role?: string;

  companyId?: number | null;
  companyName?: string;

  departmentId?: number | null;
  departmentName?: string;

  reportsToUserId?: number | null;
  reportsToUserName?: string;

  departmentCode?: string;
};

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
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

  /*
   * --------------------------------------------------------------------------
   * ASSETS
   * --------------------------------------------------------------------------
   */

  const [
    assets,
    loading,
    ,
    reload,
  ]: [
    AssetRecord[],
    boolean,
    Error | null,
    () => Promise<void>,
  ] = useLoadAction(
    loadAssets,
    [],
    {},
  );

  /*
   * --------------------------------------------------------------------------
   * LOOKUPS
   * --------------------------------------------------------------------------
   *
   * loadAssetLookups.ts normalizes the backend response into LookupOption[].
   *
   * Users:
   *   response.data.data.items
   *
   * Departments:
   *   response.data.data
   *
   * The Array.isArray() protection prevents:
   *
   *   users.map is not a function
   *
   * from occurring if an API response is temporarily invalid.
   */

  const [
    loadedUsers,
  ]: [
    LookupOption[],
    boolean,
    Error | null,
    () => Promise<void>,
  ] = useLoadAction(
    loadUsers,
    [],
    {},
  );

  const [
    loadedDepartments,
  ]: [
    LookupOption[],
    boolean,
    Error | null,
    () => Promise<void>,
  ] = useLoadAction(
    loadDepartments,
    [],
    {},
  );

  const [
    loadedCompanies,
  ]: [
    LookupOption[],
    boolean,
    Error | null,
    () => Promise<void>,
  ] = useLoadAction(
    loadCompanies,
    [],
    {},
  );

  const [
    loadedClients,
  ]: [
    LookupOption[],
    boolean,
    Error | null,
    () => Promise<void>,
  ] = useLoadAction(
    loadClients,
    [],
    {},
  );

  /*
   * Always provide arrays to child components.
   */
  const users = useMemo<ExtendedLookupOption[]>(
    () => (Array.isArray(loadedUsers) ? loadedUsers : []),
    [loadedUsers],
  );

  const departments = useMemo<ExtendedLookupOption[]>(
    () =>
      Array.isArray(loadedDepartments)
        ? loadedDepartments
        : [],
    [loadedDepartments],
  );

  const companies = useMemo<ExtendedLookupOption[]>(
    () =>
      Array.isArray(loadedCompanies)
        ? loadedCompanies
        : [],
    [loadedCompanies],
  );

  const clients = useMemo<ExtendedLookupOption[]>(
    () =>
      Array.isArray(loadedClients)
        ? loadedClients
        : [],
    [loadedClients],
  );

  /*
   * --------------------------------------------------------------------------
   * CURRENT ASSET ASSIGNMENTS
   * --------------------------------------------------------------------------
   */

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
        error,
      );

      setCurrentAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    void loadCurrentAssignments();
  }, []);

  /*
   * --------------------------------------------------------------------------
   * MUTATIONS
   * --------------------------------------------------------------------------
   */

  const [saveAsset, saving] =
    useMutateAction(createAsset);

  const [editAsset, updating] =
    useMutateAction(updateAsset);

  const [removeAsset, deleting] =
    useMutateAction(deleteAsset);

  const [logAudit] =
    useMutateAction(recordAssetAudit);

  const [allocateAsset, allocating] =
    useMutateAction(recordAssetAllocation);

  const [returnAsset, returning] =
    useMutateAction(returnAssetAllocation);

  /*
   * --------------------------------------------------------------------------
   * FILTERS / SORTING
   * --------------------------------------------------------------------------
   */

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<string>('all');

  const [departmentFilter, setDepartmentFilter] =
    useState<string>('all');

  const [sortKey, setSortKey] =
    useState<SortKey>('asset_tag');

  const [sortDir, setSortDir] =
    useState<'asc' | 'desc'>('asc');

  /*
   * --------------------------------------------------------------------------
   * DIALOG STATE
   * --------------------------------------------------------------------------
   */

  const [formOpen, setFormOpen] =
    useState(false);

  const [viewOpen, setViewOpen] =
    useState(false);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  const [historyOpen, setHistoryOpen] =
    useState(false);

  const [importOpen, setImportOpen] =
    useState(false);

  const [transferOpen, setTransferOpen] =
    useState(false);

  const [selectedAsset, setSelectedAsset] =
    useState<AssetRecord | null>(null);

  const actorName =
    user?.name ?? 'System';

  /*
   * --------------------------------------------------------------------------
   * TEAM LEADER DEPARTMENT
   * --------------------------------------------------------------------------
   *
   * Backend user response:
   *
   * {
   *   id,
   *   fullName,
   *   departmentId,
   *   departmentName
   * }
   *
   * loadAssetLookups.ts maps fullName -> name while retaining
   * departmentId.
   */

  const isTeamLeader =
    roles.includes('Team Leader') &&
    !canEdit;

  const myDepartmentId = useMemo(() => {
    if (!isTeamLeader) {
      return null;
    }

    const currentUserName =
      (user?.name ?? '').trim().toLowerCase();

    const matchedUser =
      users.find((u) => {
        const extendedUser =
          u as ExtendedLookupOption;

        return (
          extendedUser.name
            ?.trim()
            .toLowerCase() === currentUserName
        );
      });

    return (
      (matchedUser as ExtendedLookupOption | undefined)
        ?.departmentId ?? null
    );
  }, [
    isTeamLeader,
    users,
    user?.name,
  ]);

  /*
   * --------------------------------------------------------------------------
   * MERGE ASSETS WITH CURRENT ASSIGNMENTS
   * --------------------------------------------------------------------------
   */

  const assetsWithAssignments =
    useMemo(() => {
      const assignmentByAssetId =
        new Map(
          currentAssignments.map(
            (assignment) => [
              assignment.assetId,
              assignment,
            ],
          ),
        );

      return assets.map((asset) => {
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
    }, [
      assets,
      currentAssignments,
    ]);

  /*
   * --------------------------------------------------------------------------
   * FILTERED ASSETS
   * --------------------------------------------------------------------------
   */

  const filteredAssets =
    useMemo(() => {
      let list = [
        ...assetsWithAssignments,
      ];

      if (
        isTeamLeader &&
        myDepartmentId
      ) {
        list = list.filter(
          (a) =>
            a.department_id ===
            myDepartmentId,
        );
      }

      if (search.trim()) {
        const q =
          search.trim().toLowerCase();

        list = list.filter((a) =>
          [
            a.asset_tag,
            a.computer_name,
            a.host_name,
            a.serial_number,
            a.assigned_user_name,
            a.model,
          ]
            .filter(Boolean)
            .some((field) =>
              field!
                .toLowerCase()
                .includes(q),
            ),
        );
      }

      if (statusFilter !== 'all') {
        list = list.filter(
          (a) =>
            a.status === statusFilter,
        );
      }

      if (
        departmentFilter !== 'all'
      ) {
        list = list.filter(
          (a) =>
            String(
              a.department_id,
            ) === departmentFilter,
        );
      }

      list.sort((a, b) => {
        const av =
          (a[sortKey] ?? '') as string;

        const bv =
          (b[sortKey] ?? '') as string;

        const cmp =
          String(av).localeCompare(
            String(bv),
          );

        return sortDir === 'asc'
          ? cmp
          : -cmp;
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

  /*
   * --------------------------------------------------------------------------
   * SORT
   * --------------------------------------------------------------------------
   */

  const toggleSort = (
    key: SortKey,
  ) => {
    if (sortKey === key) {
      setSortDir(
        (d) =>
          d === 'asc'
            ? 'desc'
            : 'asc',
      );
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  /*
   * --------------------------------------------------------------------------
   * OPEN DIALOGS
   * --------------------------------------------------------------------------
   */

  const openAdd = () => {
    setSelectedAsset(null);
    setFormOpen(true);
  };

  const openEdit = (
    asset: AssetRecord,
  ) => {
    setSelectedAsset(asset);
    setFormOpen(true);
  };

  const openView = (
    asset: AssetRecord,
  ) => {
    setSelectedAsset(asset);
    setViewOpen(true);
  };

  const openDelete = (
    asset: AssetRecord,
  ) => {
    setSelectedAsset(asset);
    setDeleteOpen(true);
  };

  const openHistory = (
    asset: AssetRecord,
  ) => {
    setSelectedAsset(asset);
    setHistoryOpen(true);
  };

  const openTransfer = (
    asset: AssetRecord,
  ) => {
    setSelectedAsset(asset);
    setTransferOpen(true);
  };

  /*
   * --------------------------------------------------------------------------
   * TRANSFER
   * --------------------------------------------------------------------------
   */

  const handleTransfer = async (
    values: AssetTransferFormValues,
  ) => {
    if (!selectedAsset) {
      return;
    }

    const userId =
      values.allocationType === 'User'
        ? values.userId || null
        : null;

    const entityId =
      values.allocationType === 'Entity'
        ? values.entityId || null
        : null;

    const clientId =
      values.allocationType === 'Client'
        ? values.clientId || null
        : null;

    const actionType =
      selectedAsset.assigned_user_id ||
      selectedAsset.entity_id ||
      selectedAsset.client_id
        ? 'Transfer'
        : 'Allocate';

    await allocateAsset({
      assetId: selectedAsset.id,
      userId,
      departmentId: null,
      entityId,
      clientId,
      allocationType:
        values.allocationType,
      actionType,
      notes: values.notes || null,
      actorName,
    });

    await editAsset({
      id: selectedAsset.id,
      assetTag: selectedAsset.asset_tag,
      assetType: selectedAsset.asset_type,
      computerName:
        selectedAsset.computer_name,
      hostName:
        selectedAsset.host_name,
      serialNumber:
        selectedAsset.serial_number,
      manufacturer:
        selectedAsset.manufacturer,
      model:
        selectedAsset.model,
      purchaseDate:
        selectedAsset.purchase_date,
      warrantyExpiry:
        selectedAsset.warranty_expiry,
      operatingSystem:
        selectedAsset.operating_system,
      location:
        selectedAsset.location,
      status: 'Allocated',
      remarks:
        selectedAsset.remarks,
      assignedUserId: userId,
      departmentId:
        selectedAsset.department_id,
      entityId,
      clientId,
      actorName,
    });

    await logAudit({
      recordId: selectedAsset.id,
      action: 'UPDATE',
      oldValues: JSON.stringify({
        status:
          selectedAsset.status,
        assigned_user_id:
          selectedAsset.assigned_user_id,
      }),
      newValues: JSON.stringify({
        status: 'Allocated',
        allocationType:
          values.allocationType,
        userId,
        entityId,
        clientId,
      }),
      actorName,
    });

    setTransferOpen(false);

    await reload();
  };

  /*
   * --------------------------------------------------------------------------
   * RETURN
   * --------------------------------------------------------------------------
   */

  const handleReturn = async (
    asset: AssetRecord,
  ) => {
    await returnAsset({
      assetId: asset.id,
      notes:
        'Returned via Hardware page',
      actorName,
    });

    await editAsset({
      id: asset.id,
      assetTag: asset.asset_tag,
      assetType: asset.asset_type,
      computerName:
        asset.computer_name,
      hostName:
        asset.host_name,
      serialNumber:
        asset.serial_number,
      manufacturer:
        asset.manufacturer,
      model:
        asset.model,
      purchaseDate:
        asset.purchase_date,
      warrantyExpiry:
        asset.warranty_expiry,
      operatingSystem:
        asset.operating_system,
      location:
        asset.location,
      status: 'Available',
      remarks:
        asset.remarks,
      assignedUserId: null,
      departmentId: null,
      entityId: null,
      clientId: null,
      actorName,
    });

    await logAudit({
      recordId: asset.id,
      action: 'UPDATE',
      oldValues: JSON.stringify({
        status: asset.status,
        assigned_user_id:
          asset.assigned_user_id,
      }),
      newValues: JSON.stringify({
        status: 'Available',
      }),
      actorName,
    });

    await reload();
  };

  /*
   * --------------------------------------------------------------------------
   * CREATE / UPDATE ASSET
   * --------------------------------------------------------------------------
   */

const handleSubmit = async (
  values: AssetFormValues,
) => {
  try {
    const payload = {
      assetTag: values.assetTag,
      assetName: values.assetName,
      assetType: values.assetType,

      manufacturer:
        values.manufacturer || null,

      model:
        values.model || null,

      serialNumber:
        values.serialNumber || null,

      hostName:
        values.hostName || null,

      processor:
        values.processor || null,

      ramGb:
        values.ramGb != null
          ? Number(values.ramGb)
          : null,

      storageGb:
        values.storageGb != null
          ? Number(values.storageGb)
          : null,

      graphicsCard:
        values.graphicsCard || null,

      operatingSystem:
        values.operatingSystem || null,

      departmentId:
        Number(values.departmentId),

      purchaseDate:
        values.purchaseDate || null,

      warrantyExpiry:
        values.warrantyExpiry || null,

      remarks:
        values.remarks || null,
    };

    console.log(
      "Saving asset:",
      payload,
    );

    if (selectedAsset) {
      await editAsset({
        ...payload,
        id: selectedAsset.id,
      });

      await logAudit({
        recordId: selectedAsset.id,
        action: "UPDATE",
        oldValues: JSON.stringify(
          selectedAsset,
        ),
        newValues: JSON.stringify(
          payload,
        ),
        actorName,
      });
    } else {
      await saveAsset(payload);

      await logAudit({
        recordId: null,
        action: "INSERT",
        oldValues: null,
        newValues: JSON.stringify(
          payload,
        ),
        actorName,
      });
    }

    setFormOpen(false);

    await reload();

  } catch (error) {
    console.error(
      "Asset save failed:",
      error,
    );

    throw error;
  }
};

  /*
   * --------------------------------------------------------------------------
   * DELETE
   * --------------------------------------------------------------------------
   */

  const handleDelete = async () => {
    if (!selectedAsset) {
      return;
    }

    await removeAsset({
      id: selectedAsset.id,
      actorName,
    });

    await logAudit({
      recordId: selectedAsset.id,
      action: 'DELETE',
      oldValues:
        JSON.stringify(
          selectedAsset,
        ),
      newValues: null,
      actorName,
    });

    setDeleteOpen(false);

    await reload();
  };

  /*
   * --------------------------------------------------------------------------
   * IMPORT
   * --------------------------------------------------------------------------
   */

  const handleImport = async (
    rows: ImportedAssetRow[],
  ) => {
    for (const row of rows) {
      await saveAsset({
        assetTag: row.assetTag,
        assetType: 'Workstation',

        computerName:
          row.computerName || null,

        hostName:
          row.hostName || null,

        serialNumber:
          row.serialNumber || null,

        manufacturer:
          row.manufacturer || null,

        model:
          row.model || null,

        purchaseDate:
          row.purchaseDate || null,

        warrantyExpiry:
          row.warrantyExpiry || null,

        operatingSystem:
          row.operatingSystem || null,

        location:
          row.location || null,

        status:
          row.status || 'Available',

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
      newValues:
        JSON.stringify({
          importedCount:
            rows.length,
        }),
      actorName,
    });

    setImportOpen(false);

    await reload();
  };

  /*
   * --------------------------------------------------------------------------
   * RENDER
   * --------------------------------------------------------------------------
   */

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>
              Asset Inventory
            </CardTitle>

            <CardDescription>
              Track hardware assets, ownership,
              warranty and lifecycle status.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportAssetsToExcel(
                  filteredAssets,
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            {canEdit ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setImportOpen(true)
                  }
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import Excel
                </Button>

                <Button
                  size="sm"
                  onClick={openAdd}
                >
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
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={
                setStatusFilter
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All Statuses
                </SelectItem>

                <SelectItem value="Assigned">
                  Assigned
                </SelectItem>

                <SelectItem value="Available">
                  Available
                </SelectItem>

                <SelectItem value="Maintenance">
                  Maintenance
                </SelectItem>

                <SelectItem value="Scrap">
                  Scrap
                </SelectItem>
              </SelectContent>
            </Select>

            {!isTeamLeader ? (
              <Select
                value={departmentFilter}
                onValueChange={
                  setDepartmentFilter
                }
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    All Departments
                  </SelectItem>

                  {departments.map(
                    (department) => (
                      <SelectItem
                        key={department.id}
                        value={String(
                          department.id,
                        )}
                      >
                        {department.name}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            ) : null}

            <span className="text-sm text-muted-foreground">
              {filteredAssets.length}{' '}
              asset(s)
            </span>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() =>
                      toggleSort(
                        'asset_tag',
                      )
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      Asset ID
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() =>
                      toggleSort(
                        'computer_name',
                      )
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      Computer Name
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>

                  <TableHead>
                    Serial Number
                  </TableHead>

                  <TableHead>
                    Manufacturer / Model
                  </TableHead>

                  <TableHead>
                    Current User
                  </TableHead>

                  <TableHead>
                    Department
                  </TableHead>

                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() =>
                      toggleSort(
                        'warranty_expiry',
                      )
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      Warranty Expiry
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() =>
                      toggleSort('status')
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>

                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ||
                assignmentsLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Loading assets…
                    </TableCell>
                  </TableRow>
                ) : filteredAssets.length ===
                  0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No assets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map(
                    (asset) => (
                      <TableRow
                        key={asset.id}
                      >
                        <TableCell className="font-medium">
                          {asset.asset_tag}
                        </TableCell>

                        <TableCell>
                          {asset.computer_name ??
                            '—'}
                        </TableCell>

                        <TableCell>
                          {asset.serial_number ??
                            '—'}
                        </TableCell>

                        <TableCell>
                          {asset.manufacturer ??
                            '—'}{' '}
                          {asset.model
                            ? `/ ${asset.model}`
                            : ''}
                        </TableCell>

                        <TableCell>
                          {asset.assigned_user_name ??
                            'Unassigned'}
                        </TableCell>

                        <TableCell>
                          {asset.department_name ??
                            '—'}
                        </TableCell>

                        <TableCell>
                          {asset.warranty_expiry?.slice(
                            0,
                            10,
                          ) ?? '—'}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={statusVariant(
                              asset.status,
                            )}
                          >
                            {asset.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                Actions
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  openView(
                                    asset,
                                  )
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  openHistory(
                                    asset,
                                  )
                                }
                              >
                                <History className="mr-2 h-4 w-4" />
                                Audit History
                              </DropdownMenuItem>

                              {canEdit ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openEdit(
                                        asset,
                                      )
                                    }
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() =>
                                      openTransfer(
                                        asset,
                                      )
                                    }
                                  >
                                    <ArrowRightLeft className="mr-2 h-4 w-4" />

                                    {asset.assigned_user_id ||
                                    asset.entity_id ||
                                    asset.client_id
                                      ? 'Transfer'
                                      : 'Allocate'}
                                  </DropdownMenuItem>

                                  {asset.assigned_user_id ||
                                  asset.entity_id ||
                                  asset.client_id ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleReturn(
                                          asset,
                                        )
                                      }
                                    >
                                      <Undo2 className="mr-2 h-4 w-4" />
                                      Return
                                    </DropdownMenuItem>
                                  ) : null}

                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() =>
                                      openDelete(
                                        asset,
                                      )
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Retire / Delete
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ),
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* ADD / EDIT ASSET                                                    */}
      {/* ------------------------------------------------------------------ */}

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        asset={selectedAsset}
        users={users}
        departments={departments}
        entities={companies}
        clients={clients}
        saving={saving || updating}
        onSubmit={handleSubmit}
      />

      {/* ------------------------------------------------------------------ */}
      {/* VIEW                                                                */}
      {/* ------------------------------------------------------------------ */}

      <AssetViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        asset={selectedAsset}
      />

      {/* ------------------------------------------------------------------ */}
      {/* DELETE                                                              */}
      {/* ------------------------------------------------------------------ */}

      <AssetDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        asset={selectedAsset}
        deleting={deleting}
        onConfirm={handleDelete}
      />

      {/* ------------------------------------------------------------------ */}
      {/* AUDIT HISTORY                                                       */}
      {/* ------------------------------------------------------------------ */}

      <AssetAuditHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        asset={selectedAsset}
      />

      {/* ------------------------------------------------------------------ */}
      {/* IMPORT                                                              */}
      {/* ------------------------------------------------------------------ */}

      <AssetImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        importing={saving}
        onImport={handleImport}
      />

      {/* ------------------------------------------------------------------ */}
      {/* TRANSFER                                                            */}
      {/* ------------------------------------------------------------------ */}

      <AssetTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        asset={selectedAsset}
        users={users}
        entities={companies}
        clients={clients}
        saving={allocating || updating}
        onSubmit={handleTransfer}
      />
    </div>
  );
}
