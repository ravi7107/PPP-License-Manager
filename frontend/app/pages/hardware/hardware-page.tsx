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

import {
  AppRole,
  canManage,
  isTeamLeader as isTeamLeaderRole,
  isSuperAdmin as isSuperAdminRole,
  isITAdmin as isITAdminRole,
} from '@/lib/auth/roles';

import loadAssets from '@/actions/assets/loadAssets';

import {
  loadUsers,
  loadDepartments,
} from '@/actions/assets/loadAssetLookups';

import createAsset from '@/actions/assets/createAsset';
import updateAsset from '@/actions/assets/updateAsset';
import deleteAsset from '@/actions/assets/deleteAsset';
import { recordAssetAudit } from '@/actions/assets/auditLog';

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

import {
  AssetReallocationRequestDialog,
  AssetReallocationRequestFormValues,
} from '@/app/pages/hardware/components/asset-reallocation-request-dialog';

import { ReallocationRequestsPanel } from '@/app/pages/hardware/components/reallocation-requests-panel';

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
  assignAsset as apiAssignAsset,
  transferAsset as apiTransferAsset,
  returnAsset as apiReturnAsset,
} from '@/lib/api/asset-assignments.api';

import {
  OfficeSeat,
  getOfficeSeats,
} from '@/lib/api/office-locations.api';

import {
  createReallocationRequest as apiCreateReallocationRequest,
} from '@/lib/api/asset-reallocation-requests.api';

type SortKey =
  | 'assetTag'
  | 'hostName'
  | 'purchaseDate'
  | 'warrantyExpiry'
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

// Asset rows on this page, once merged with their current AssetAssignment
// (if any). assignedUserId/assignedUserName/currentAssignmentId are added
// by the merge below and are not part of the raw /Asset response.
type AssetWithAssignment = AssetRecord & {
  assignedUserId: number | null;
  assignedUserName: string | null;
  currentAssignmentId: number | null;
  currentSeatId: number | null;
  currentSeatLabel: string | null;
};

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Assigned':
      return 'default';

    case 'Maintenance':
    case 'Reserved':
      return 'secondary';

    case 'Retired':
      return 'destructive';

    default:
      return 'outline';
  }
}

export default function HardwarePage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const user = useUser();

  const canEdit = canManage(roles);
  const isSuperAdmin = isSuperAdminRole(roles);
  const isITAdmin = isITAdminRole(roles);

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

  // A seat can only be picked for an asset if the seat's office location
  // belongs to the same company as the asset's department - the backend
  // enforces this (ValidateSeatAssignmentAsync), so the seat pickers below
  // need to pre-filter to it rather than let the user pick an incompatible
  // seat and only find out on submit.
  const getDepartmentCompanyId = (
    departmentId: number | null | undefined,
  ): number | null => {
    if (departmentId == null) return null;

    const department = departments.find(
      (d) => d.id === departmentId,
    );

    return department?.companyId ?? null;
  };

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
   * OFFICE SEATS (for the Allocate dialog's seat picker)
   * --------------------------------------------------------------------------
   */

  const [seats, setSeats] = useState<OfficeSeat[]>([]);

  const loadSeats = async () => {
    try {
      const result = await getOfficeSeats();
      setSeats(result);
    } catch (error) {
      console.error('Unable to load office seats:', error);
      setSeats([]);
    }
  };

  useEffect(() => {
    void loadSeats();
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

  const [assignmentSaving, setAssignmentSaving] =
    useState(false);

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
    useState<SortKey>('assetTag');

  const [sortDir, setSortDir] =
    useState<'asc' | 'desc'>('asc');

  /*
   * --------------------------------------------------------------------------
   * DIALOG STATE
   * --------------------------------------------------------------------------
   */

  const [formOpen, setFormOpen] =
    useState(false);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [viewOpen, setViewOpen] =
    useState(false);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState<string | null>(null);

  const [historyOpen, setHistoryOpen] =
    useState(false);

  const [importOpen, setImportOpen] =
    useState(false);

  const [transferOpen, setTransferOpen] =
    useState(false);

  const [transferError, setTransferError] =
    useState<string | null>(null);

  const [requestOpen, setRequestOpen] =
    useState(false);

  const [requestError, setRequestError] =
    useState<string | null>(null);

  const [requestSaving, setRequestSaving] =
    useState(false);

  // Bumped after a reallocation request is submitted so the "My
  // Reallocation Requests" panel below refetches and shows it.
  const [requestsRefreshToken, setRequestsRefreshToken] =
    useState(0);

  const [selectedAsset, setSelectedAsset] =
    useState<AssetWithAssignment | null>(null);

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
    isTeamLeaderRole(roles) &&
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
    useMemo<AssetWithAssignment[]>(() => {
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
            assignedUserId: null,
            assignedUserName: null,
            currentAssignmentId: null,
            currentSeatId: null,
            currentSeatLabel: null,
          };
        }

        return {
          ...asset,

          assignedUserId:
            assignment.userId,

          assignedUserName:
            assignment.userName,

          // Deliberately NOT overriding departmentId/departmentName with
          // assignment.departmentId/departmentName here (which reflect the
          // assigned USER's department, not the asset's own). Doing so
          // used to shadow the asset's real department everywhere this
          // record was used - including the Edit dialog, which made a
          // department change look like it "didn't save" because the
          // table kept re-displaying the assigned user's department after
          // reload. The asset's own department (from the ...asset spread
          // above) is also what the backend's Team-Lead scoping checks
          // (e.g. reallocation requests) key off, so this keeps the
          // frontend consistent with that.

          currentAssignmentId:
            assignment.id,

          currentSeatId:
            assignment.seatId ?? null,

          currentSeatLabel:
            assignment.seatId
              ? [
                  assignment.officeLocationName,
                  assignment.floorName,
                  assignment.seatCode,
                ]
                  .filter(Boolean)
                  .join(' / ')
              : null,

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
            a.departmentId ===
            myDepartmentId,
        );
      }

      if (search.trim()) {
        const q =
          search.trim().toLowerCase();

        list = list.filter((a) =>
          [
            a.assetTag,
            a.hostName,
            a.serialNumber,
            a.assignedUserName,
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
              a.departmentId,
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
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (
    asset: AssetWithAssignment,
  ) => {
    setSelectedAsset(asset);
    setFormError(null);
    setFormOpen(true);
  };

  const openView = (
    asset: AssetWithAssignment,
  ) => {
    setSelectedAsset(asset);
    setViewOpen(true);
  };

  const openDelete = (
    asset: AssetWithAssignment,
  ) => {
    setSelectedAsset(asset);
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const openHistory = (
    asset: AssetWithAssignment,
  ) => {
    setSelectedAsset(asset);
    setHistoryOpen(true);
  };

  const openTransfer = (
    asset: AssetWithAssignment,
  ) => {
    setSelectedAsset(asset);
    setTransferError(null);
    setTransferOpen(true);
  };

  const openRequest = (
    asset: AssetWithAssignment,
  ) => {
    setSelectedAsset(asset);
    setRequestError(null);
    setRequestOpen(true);
  };

  /*
   * --------------------------------------------------------------------------
   * ALLOCATE / REASSIGN
   * --------------------------------------------------------------------------
   *
   * Routes through the real AssetAssignment API (POST /AssetAssignment/assign
   * or /{id}/transfer) instead of updating the Asset row directly. The
   * backend keeps Asset.Status / Asset.IsReadyForAssignment in sync as part
   * of the same transaction, so there is nothing left to do here besides
   * refreshing the asset list and the current-assignments list.
   */

  const handleTransfer = async (
    values: AssetTransferFormValues,
  ) => {
    if (!selectedAsset) {
      return;
    }

    setTransferError(null);
    setAssignmentSaving(true);

    const userId = Number(values.userId);

    const parsedSeatId = Number(values.seatId);
    const seatId =
      values.seatId && !Number.isNaN(parsedSeatId)
        ? parsedSeatId
        : null;

    try {
      if (selectedAsset.currentAssignmentId) {
        await apiTransferAsset(
          selectedAsset.currentAssignmentId,
          {
            newUserId: userId,
            remarks: values.notes || null,
            seatId,
          },
        );
      } else {
        await apiAssignAsset({
          assetId: selectedAsset.id,
          userId,
          remarks: values.notes || null,
          seatId,
        });
      }

      setTransferOpen(false);

      await Promise.all([
        reload(),
        loadCurrentAssignments(),
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to allocate this asset. Please try again.';

      setTransferError(message);
    } finally {
      setAssignmentSaving(false);
    }
  };

  /*
   * --------------------------------------------------------------------------
   * REQUEST REALLOCATION (Team Lead)
   * --------------------------------------------------------------------------
   *
   * Team Leads can't call Assign/Transfer directly - this raises an
   * AssetReallocationRequest instead, which only takes effect once both a
   * Super Admin and an IT Admin have approved it.
   */

  const handleReallocationRequest = async (
    values: AssetReallocationRequestFormValues,
  ) => {
    if (!selectedAsset) {
      return;
    }

    setRequestError(null);
    setRequestSaving(true);

    const parsedSeatId = Number(values.seatId);
    const seatId =
      values.seatId && !Number.isNaN(parsedSeatId)
        ? parsedSeatId
        : null;

    try {
      await apiCreateReallocationRequest({
        assetId: selectedAsset.id,
        proposedUserId: Number(values.proposedUserId),
        proposedSeatId: seatId,
        remarks: values.remarks || null,
      });

      setRequestOpen(false);
      setRequestsRefreshToken((n) => n + 1);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to submit this reallocation request. Please try again.';

      setRequestError(message);
    } finally {
      setRequestSaving(false);
    }
  };

  /*
   * --------------------------------------------------------------------------
   * RETURN
   * --------------------------------------------------------------------------
   */

  const handleReturn = async (
    asset: AssetWithAssignment,
  ) => {
    if (!asset.currentAssignmentId) {
      return;
    }

    try {
      setAssignmentSaving(true);

      await apiReturnAsset(
        asset.currentAssignmentId,
        {
          remarks: 'Returned via Hardware page',
        },
      );

      await Promise.all([
        reload(),
        loadCurrentAssignments(),
      ]);
    } catch (error: any) {
      console.error(
        'Failed to return asset:',
        error,
      );

      window.alert(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to return this asset. Please try again.',
      );
    } finally {
      setAssignmentSaving(false);
    }
  };

  /*
   * --------------------------------------------------------------------------
   * CREATE / UPDATE ASSET
   * --------------------------------------------------------------------------
   */

const handleSubmit = async (
  values: AssetFormValues,
) => {
  setFormError(null);

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

    if (selectedAsset) {
      // An asset with an active AssetAssignment must stay "Assigned" here
      // — status changes for an assigned asset go through Allocate /
      // Reassign / Return, which keep AssetAssignment and Asset.Status in
      // sync together. Otherwise, honor whatever the form's Status field
      // was set to (Available / Maintenance / Reserved / Retired).
      const isCurrentlyAssigned = Boolean(
        selectedAsset.assignedUserId,
      );

      await editAsset({
        ...payload,
        id: selectedAsset.id,
        status: isCurrentlyAssigned
          ? selectedAsset.status
          : values.status,
        isActive: selectedAsset.isActive,
        isReadyForAssignment: isCurrentlyAssigned
          ? selectedAsset.isReadyForAssignment
          : values.status === 'Available',
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

  } catch (error: any) {
    console.error(
      "Asset save failed:",
      error,
    );

    const message =
      error?.response?.data?.message ||
      error?.response?.data?.errors?.[0] ||
      error?.message ||
      "Failed to save asset. Please check the form and try again.";

    setFormError(message);
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

    setDeleteError(null);

    try {
      await removeAsset({
        id: selectedAsset.id,
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

      await Promise.all([
        reload(),
        loadCurrentAssignments(),
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to retire this asset. Please try again.';

      setDeleteError(message);
    }
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

        hostName:
          row.hostName || row.computerName || null,

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

        status:
          row.status || 'Available',

        remarks: null,
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
                placeholder="Search by asset ID, host name, serial, user…"
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

                <SelectItem value="Reserved">
                  Reserved
                </SelectItem>

                <SelectItem value="Retired">
                  Retired
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
                        'assetTag',
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
                        'hostName',
                      )
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      Host Name
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
                        'warrantyExpiry',
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
                          {asset.assetTag}
                        </TableCell>

                        <TableCell>
                          {asset.hostName ??
                            '—'}
                        </TableCell>

                        <TableCell>
                          {asset.serialNumber ??
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
                          {asset.assignedUserName ??
                            'Unassigned'}
                        </TableCell>

                        <TableCell>
                          {asset.departmentName ??
                            '—'}
                        </TableCell>

                        <TableCell>
                          {asset.warrantyExpiry?.slice(
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

                                    {asset.assignedUserId
                                      ? 'Reassign'
                                      : 'Allocate'}
                                  </DropdownMenuItem>

                                  {asset.assignedUserId ? (
                                    <DropdownMenuItem
                                      disabled={assignmentSaving}
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

                              {!canEdit &&
                              isTeamLeader &&
                              asset.assignedUserId ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openRequest(
                                      asset,
                                    )
                                  }
                                >
                                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                                  Request Reallocation
                                </DropdownMenuItem>
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
      {/* REALLOCATION REQUESTS                                               */}
      {/* ------------------------------------------------------------------ */}

      {canEdit ? (
        <ReallocationRequestsPanel
          mode="pending"
          isSuperAdmin={isSuperAdmin}
          isITAdmin={isITAdmin}
          refreshToken={requestsRefreshToken}
        />
      ) : isTeamLeader ? (
        <ReallocationRequestsPanel
          mode="mine"
          refreshToken={requestsRefreshToken}
        />
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* ADD / EDIT ASSET                                                    */}
      {/* ------------------------------------------------------------------ */}

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        asset={selectedAsset}
        isAssigned={Boolean(
          selectedAsset?.assignedUserId,
        )}
        departments={departments}
        saving={saving || updating}
        onSubmit={handleSubmit}
        error={formError}
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
        error={deleteError}
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
      {/* ALLOCATE / REASSIGN                                                 */}
      {/* ------------------------------------------------------------------ */}

      <AssetTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        asset={selectedAsset}
        isReassignment={Boolean(
          selectedAsset?.assignedUserId,
        )}
        currentUserId={
          selectedAsset?.assignedUserId ?? null
        }
        currentSeatId={
          selectedAsset?.currentSeatId ?? null
        }
        currentSeatLabel={
          selectedAsset?.currentSeatLabel ?? null
        }
        assetDepartmentId={
          selectedAsset?.departmentId ?? null
        }
        assetCompanyId={getDepartmentCompanyId(
          selectedAsset?.departmentId,
        )}
        users={users}
        seats={seats}
        saving={assignmentSaving}
        error={transferError}
        onSubmit={handleTransfer}
      />

      {/* ------------------------------------------------------------------ */}
      {/* REQUEST REALLOCATION (Team Lead)                                    */}
      {/* ------------------------------------------------------------------ */}

      <AssetReallocationRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        asset={selectedAsset}
        currentUserId={
          selectedAsset?.assignedUserId ?? null
        }
        currentSeatId={
          selectedAsset?.currentSeatId ?? null
        }
        currentSeatLabel={
          selectedAsset?.currentSeatLabel ?? null
        }
        assetDepartmentId={
          selectedAsset?.departmentId ?? null
        }
        assetCompanyId={getDepartmentCompanyId(
          selectedAsset?.departmentId,
        )}
        users={users}
        seats={seats}
        saving={requestSaving}
        error={requestError}
        onSubmit={handleReallocationRequest}
      />
    </div>
  );
}
