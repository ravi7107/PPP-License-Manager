import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  Undo2,
  Ellipsis,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Wrench,
  Archive,
  Monitor,
  MapPin,
  SlidersHorizontal,
  X,
  Truck,
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
import { cn } from '@/lib/utils';
import { StatusPill } from '@/app/pages/hardware/components/status-pill';

import {
  formatDate,
  daysRemaining,
  warrantyHealth,
} from '@/app/pages/hardware/components/common/asset-utils';

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
  ASSET_TYPES,
} from '@/app/pages/hardware/types';

import { getVendors, Vendor } from '@/lib/api/vendors.api';
import { getCompanies, Company } from '@/lib/api/companies.api';

import {
  exportAssetsToExcel,
  ImportedAssetRow,
  resolveImportedAssetName,
  resolveImportedAssetType,
  resolveImportedOwnershipType,
  resolveImportedDualMonitor,
  resolveImportedGb,
} from '@/lib/utils/asset-excel';
import { AssetImportResult } from '@/app/pages/hardware/components/asset-import-dialog';

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
  currentWorkMode: string | null;
};

/*
 * --------------------------------------------------------------------------
 * PRESENTATIONAL HELPERS
 * --------------------------------------------------------------------------
 *
 * Small, page-local components - none of them fetch data, call the API, or
 * own business state. They only render values the page's existing state/
 * memos already compute.
 */

function StatCard({
  title,
  value,
  subLabel,
  icon,
}: {
  title: string;
  value: number;
  subLabel?: string | null;
  icon: ReactNode;
}) {
  return (
    <div className="hardware-stat-card flex items-start justify-between gap-3 p-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>

        <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-foreground">
          {value}
        </p>

        {subLabel ? (
          <p className="mt-2 text-xs text-muted-foreground">{subLabel}</p>
        ) : null}
      </div>

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
    </div>
  );
}

// Native checkbox (same pattern already used for "Remember me" on the login
// page) rather than a Radix Checkbox component - @radix-ui/react-checkbox
// isn't an existing dependency of this project. Wrapped only so the
// "some but not all rows on this page are selected" indeterminate visual
// state can be set imperatively (the DOM property has no React prop).
function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label="Select all assets on this page"
      className="h-4 w-4 rounded border-input text-primary accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
    />
  );
}

function SortIndicator({
  active,
  dir,
}: {
  active: boolean;
  dir: 'asc' | 'desc';
}) {
  if (!active) {
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
  }

  return dir === 'asc' ? (
    <ArrowUp className="h-3 w-3 text-primary" />
  ) : (
    <ArrowDown className="h-3 w-3 text-primary" />
  );
}

// Warranty expiry as "17 Jan 2027" + a "154 days left" (or "Expired 40 days
// ago") line with a green/amber/red health dot - all derived from the
// asset's own real warrantyExpiry value via the existing formatDate() /
// daysRemaining() / warrantyHealth() helpers, nothing hardcoded.
function WarrantyCell({ expiry }: { expiry?: string | null }) {
  if (!expiry) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const health = warrantyHealth(expiry);
  const days = daysRemaining(expiry);

  const dotColor =
    health === 'expired'
      ? 'bg-red-500'
      : health === 'expiring'
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  const textColor =
    health === 'expired'
      ? 'text-red-700'
      : health === 'expiring'
        ? 'text-amber-700'
        : 'text-emerald-700';

  const daysLabel =
    days === null
      ? null
      : days < 0
        ? `Expired ${Math.abs(days)}d ago`
        : `${days}d left`;

  return (
    <div className="leading-tight">
      <div className="text-sm text-foreground">{formatDate(expiry)}</div>

      {daysLabel ? (
        <div
          className={cn(
            'mt-0.5 inline-flex items-center gap-1 text-xs font-medium',
            textColor,
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} aria-hidden />
          {daysLabel}
        </div>
      ) : null}
    </div>
  );
}

export default function HardwarePage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const user = useUser();

  const canEdit = canManage(roles);
  const isSuperAdmin = isSuperAdminRole(roles);
  const isITAdmin = isITAdminRole(roles);

  // Scope the shared premium Stripe/Apple-style re-skin (index.css,
  // `app-premium-theme` - also used by the Executive Dashboard) to just
  // this page - toggling a class on <body> (rather than a wrapper div) so
  // it also reaches Select/Dialog/DropdownMenu content, which Radix
  // portals onto <body> outside this component's own DOM subtree.
  useEffect(() => {
    document.body.classList.add('app-premium-theme');

    return () => {
      document.body.classList.remove('app-premium-theme');
    };
  }, []);

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

  const [assetTypeFilter, setAssetTypeFilter] =
    useState<string>('all');

  const [warrantyFilter, setWarrantyFilter] =
    useState<string>('all');

  const [ownershipFilter, setOwnershipFilter] =
    useState<string>('all');

  const [dualMonitorFilter, setDualMonitorFilter] =
    useState<string>('all');

  // Rental vendor picker for the Add/Edit Asset form's Ownership
  // section (rented assets - see AssetFormDialog).
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    getVendors()
      .then((all) => setVendors(all.filter((v) => v.isActive)))
      .catch(() => setVendors([]));
  }, []);

  // Entities for the "complete" Excel import template's per-row
  // Entity/Department resolution (see handleImport) - a real org can
  // have multiple Departments per Entity, so each row names both rather
  // than relying on a single dialog-level picker for the whole file.
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    getCompanies()
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, []);

  /*
   * --------------------------------------------------------------------------
   * ROW SELECTION (bulk export only - every other row action already goes
   * through its own dialog/confirmation and stays a single-row action, since
   * bulk-applying them safely would mean inventing new backend behavior).
   * --------------------------------------------------------------------------
   */

  const [selectedIds, setSelectedIds] =
    useState<Set<number>>(new Set());

  /*
   * --------------------------------------------------------------------------
   * PAGINATION (client-side only - filteredAssets is already the full,
   * already-loaded list, so this just slices it for display).
   * --------------------------------------------------------------------------
   */

  const [pageSize, setPageSize] =
    useState<number>(25);

  const [currentPage, setCurrentPage] =
    useState<number>(1);

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
            currentWorkMode: null,
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

          currentWorkMode:
            assignment.workMode ?? null,

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

      if (assetTypeFilter !== 'all') {
        list = list.filter(
          (a) => a.assetType === assetTypeFilter,
        );
      }

      if (warrantyFilter !== 'all') {
        list = list.filter(
          (a) => warrantyHealth(a.warrantyExpiry) === warrantyFilter,
        );
      }

      if (ownershipFilter !== 'all') {
        list = list.filter(
          (a) => (a.ownershipType ?? 'Owned') === ownershipFilter,
        );
      }

      if (dualMonitorFilter !== 'all') {
        list = list.filter(
          (a) => Boolean(a.dualMonitor) === (dualMonitorFilter === 'yes'),
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
      assetTypeFilter,
      warrantyFilter,
      ownershipFilter,
      dualMonitorFilter,
      sortKey,
      sortDir,
      isTeamLeader,
      myDepartmentId,
    ]);

  /*
   * --------------------------------------------------------------------------
   * PAGINATION / SELECTION (derived)
   * --------------------------------------------------------------------------
   */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAssets.length / pageSize),
  );

  const paginatedAssets = useMemo(
    () =>
      filteredAssets.slice(
        (currentPage - 1) * pageSize,
        (currentPage - 1) * pageSize + pageSize,
      ),
    [filteredAssets, currentPage, pageSize],
  );

  // Jump back to page 1 whenever the underlying filtered set changes shape,
  // so the user never lands on a page that no longer makes sense.
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    departmentFilter,
    assetTypeFilter,
    warrantyFilter,
    ownershipFilter,
    dualMonitorFilter,
    pageSize,
  ]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const allVisibleSelected =
    paginatedAssets.length > 0 &&
    paginatedAssets.every((a) => selectedIds.has(a.id));

  const someVisibleSelected =
    !allVisibleSelected &&
    paginatedAssets.some((a) => selectedIds.has(a.id));

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (allVisibleSelected) {
        paginatedAssets.forEach((a) => next.delete(a.id));
      } else {
        paginatedAssets.forEach((a) => next.add(a.id));
      }

      return next;
    });
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const selectedAssets = useMemo(
    () =>
      assetsWithAssignments.filter((a) => selectedIds.has(a.id)),
    [assetsWithAssignments, selectedIds],
  );

  const handleExportSelected = () => {
    exportAssetsToExcel(selectedAssets, 'selected-assets.xlsx');
  };

  /*
   * --------------------------------------------------------------------------
   * ACTIVE FILTER CHIPS
   * --------------------------------------------------------------------------
   */

  const WARRANTY_FILTER_LABELS: Record<string, string> = {
    healthy: 'Healthy',
    expiring: 'Expiring Soon',
    expired: 'Expired',
  };

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label: `Status: ${statusFilter}`,
        onRemove: () => setStatusFilter('all'),
      });
    }

    if (departmentFilter !== 'all') {
      const dept = departments.find(
        (d) => String(d.id) === departmentFilter,
      );

      chips.push({
        key: 'department',
        label: `Department: ${dept?.name ?? departmentFilter}`,
        onRemove: () => setDepartmentFilter('all'),
      });
    }

    if (assetTypeFilter !== 'all') {
      chips.push({
        key: 'type',
        label: `Type: ${assetTypeFilter}`,
        onRemove: () => setAssetTypeFilter('all'),
      });
    }

    if (warrantyFilter !== 'all') {
      chips.push({
        key: 'warranty',
        label: `Warranty: ${WARRANTY_FILTER_LABELS[warrantyFilter] ?? warrantyFilter}`,
        onRemove: () => setWarrantyFilter('all'),
      });
    }

    if (ownershipFilter !== 'all') {
      chips.push({
        key: 'ownership',
        label: `Ownership: ${ownershipFilter}`,
        onRemove: () => setOwnershipFilter('all'),
      });
    }

    if (dualMonitorFilter !== 'all') {
      chips.push({
        key: 'dualMonitor',
        label: `Dual Monitor: ${dualMonitorFilter === 'yes' ? 'Yes' : 'No'}`,
        onRemove: () => setDualMonitorFilter('all'),
      });
    }

    return chips;
  }, [statusFilter, departmentFilter, assetTypeFilter, warrantyFilter, ownershipFilter, dualMonitorFilter, departments]);

  const resetAllFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setAssetTypeFilter('all');
    setWarrantyFilter('all');
    setOwnershipFilter('all');
    setDualMonitorFilter('all');
  };

  /*
   * --------------------------------------------------------------------------
   * KPI SUMMARY (Stripe-style stat strip above the table)
   * --------------------------------------------------------------------------
   *
   * Derived entirely from assetsWithAssignments (the same role-scoped list
   * the table filters from) — no extra API calls, and independent of the
   * table's own search/status/department filters, same as the demo kit's
   * "totals stay fixed while you filter the grid below" behavior.
   */

  const assetStats = useMemo(() => {
    let inMaintenance = 0;
    let assigned = 0;
    let retired = 0;

    assetsWithAssignments.forEach((a) => {
      if (a.status === 'Maintenance' || a.status === 'Reserved') {
        inMaintenance++;
      } else if (a.status === 'Assigned') {
        assigned++;
      } else if (a.status === 'Retired') {
        retired++;
      }
    });

    return {
      total: assetsWithAssignments.length,
      assigned,
      inMaintenance,
      retired,
    };
  }, [assetsWithAssignments]);

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
      values.seatId &&
      values.seatId !== '__none__' &&
      !Number.isNaN(parsedSeatId)
        ? parsedSeatId
        : null;

    try {
      await apiCreateReallocationRequest({
        assetId: selectedAsset.id,
        requestType: values.requestType,
        proposedUserId:
          values.requestType === 'Reassign'
            ? Number(values.proposedUserId)
            : null,
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

      ownershipType:
        values.ownershipType || 'Owned',

      vendorId:
        values.ownershipType === 'Rented' && values.vendorId
          ? Number(values.vendorId)
          : null,

      rentalStartDate:
        values.ownershipType === 'Rented'
          ? values.rentalStartDate || null
          : null,

      rentalEndDate:
        values.ownershipType === 'Rented'
          ? values.rentalEndDate || null
          : null,

      dualMonitor:
        Boolean(values.dualMonitor),
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
  ): Promise<AssetImportResult> => {
    const failed: AssetImportResult['failed'] = [];
    let succeeded = 0;

    // Each row resolves its own Entity/Department (a real org can have
    // multiple Departments per Entity, so a single dialog-level picker
    // for the whole file isn't enough) and, if Rented, its own Vendor -
    // by exact name match (case-insensitive) against what's already in
    // the system. A row failing to resolve doesn't abort the batch; it's
    // reported individually so the rest of the file still imports.
    for (const row of rows) {
      try {
        const entityInput = row.entity.trim();
        const departmentInput = row.department.trim();

        if (!entityInput) {
          throw new Error('Entity is required (see the "Entity" column).');
        }

        if (!departmentInput) {
          throw new Error('Department is required (see the "Department" column).');
        }

        const company = companies.find(
          (c) => c.name.trim().toLowerCase() === entityInput.toLowerCase(),
        );

        if (!company) {
          throw new Error(`Entity "${entityInput}" was not found.`);
        }

        const department = departments.find(
          (d) =>
            d.companyId === company.id &&
            (d.name ?? '').trim().toLowerCase() === departmentInput.toLowerCase(),
        );

        if (!department) {
          throw new Error(
            `Department "${departmentInput}" was not found under Entity "${entityInput}".`,
          );
        }

        const ownershipType = resolveImportedOwnershipType(row);

        let vendorId: number | null = null;
        if (ownershipType === 'Rented' && row.vendor.trim()) {
          const vendorInput = row.vendor.trim();
          const vendor = vendors.find(
            (v) => v.vendorName.trim().toLowerCase() === vendorInput.toLowerCase(),
          );
          // A non-matching Vendor name doesn't fail the row - the asset
          // still imports as Rented, just without a linked vendor (can
          // be filled in later from the Add/Edit form).
          vendorId = vendor ? vendor.id : null;
        }

        await saveAsset({
          assetTag: row.assetTag,
          assetName: resolveImportedAssetName(row),
          assetType: resolveImportedAssetType(row),
          departmentId: department.id,

          hostName:
            row.hostName || row.computerName || null,

          serialNumber:
            row.serialNumber || null,

          manufacturer:
            row.manufacturer || null,

          model:
            row.model || null,

          processor:
            row.processor || null,

          ramGb:
            resolveImportedGb(row.ramGb) ?? null,

          storageGb:
            resolveImportedGb(row.storageGb) ?? null,

          graphicsCard:
            row.graphicsCard || null,

          purchaseDate:
            row.purchaseDate || null,

          warrantyExpiry:
            row.warrantyExpiry || null,

          operatingSystem:
            row.operatingSystem || null,

          status:
            row.status || 'Available',

          ownershipType,
          vendorId,

          rentalStartDate:
            ownershipType === 'Rented' ? row.rentalStartDate || null : null,

          rentalEndDate:
            ownershipType === 'Rented' ? row.rentalEndDate || null : null,

          dualMonitor: resolveImportedDualMonitor(row),

          remarks: null,
        });

        succeeded += 1;
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to create this asset.';

        failed.push({ row, message });
      }
    }

    if (succeeded > 0) {
      await logAudit({
        recordId: null,
        action: 'INSERT',
        oldValues: null,
        newValues:
          JSON.stringify({
            importedCount: succeeded,
            failedCount: failed.length,
          }),
        actorName,
      });

      await reload();
    }

    return { succeeded, failed };
  };

  /*
   * --------------------------------------------------------------------------
   * RENDER
   * --------------------------------------------------------------------------
   */

  return (
    <div className="space-y-5">
      {/* -------------------------------------------------------------- */}
      {/* PAGE HEADER                                                     */}
      {/* -------------------------------------------------------------- */}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Hardware Assets
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Track hardware assets, ownership, warranty and lifecycle status
          across the organization.
        </p>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* KPI CARDS                                                       */}
      {/* -------------------------------------------------------------- */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Assets"
          value={assetStats.total}
          icon={<Monitor className="h-4 w-4" />}
        />

        <StatCard
          title="Assigned"
          value={assetStats.assigned}
          subLabel={
            assetStats.total
              ? `${((assetStats.assigned / assetStats.total) * 100).toFixed(1)}% of total`
              : undefined
          }
          icon={<UserCheck className="h-4 w-4" />}
        />

        <StatCard
          title="In Maintenance"
          value={assetStats.inMaintenance}
          subLabel={
            assetStats.total
              ? `${((assetStats.inMaintenance / assetStats.total) * 100).toFixed(1)}% of total`
              : undefined
          }
          icon={<Wrench className="h-4 w-4" />}
        />

        <StatCard
          title="Retired"
          value={assetStats.retired}
          subLabel={
            assetStats.total
              ? `${((assetStats.retired / assetStats.total) * 100).toFixed(1)}% of total`
              : undefined
          }
          icon={<Archive className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">
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

        <CardContent className="space-y-3">
          {/* ---------------------------------------------------------- */}
          {/* SEARCH / FILTERS                                            */}
          {/* ---------------------------------------------------------- */}

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
              <SelectTrigger className="w-40">
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
                <SelectTrigger className="w-48">
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

            <Select
              value={assetTypeFilter}
              onValueChange={setAssetTypeFilter}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All Types
                </SelectItem>

                {ASSET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={warrantyFilter}
              onValueChange={setWarrantyFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Warranty" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All Warranty
                </SelectItem>

                <SelectItem value="healthy">
                  Healthy
                </SelectItem>

                <SelectItem value="expiring">
                  Expiring Soon
                </SelectItem>

                <SelectItem value="expired">
                  Expired
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={ownershipFilter}
              onValueChange={setOwnershipFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Ownership" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  Owned & Rented
                </SelectItem>

                <SelectItem value="Owned">
                  Owned
                </SelectItem>

                <SelectItem value="Rented">
                  Rented
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={dualMonitorFilter}
              onValueChange={setDualMonitorFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Dual Monitor" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  Any Monitor Setup
                </SelectItem>

                <SelectItem value="yes">
                  Dual Monitor
                </SelectItem>

                <SelectItem value="no">
                  Single Monitor
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* ACTIVE FILTER CHIPS                                         */}
          {/* ---------------------------------------------------------- */}

          {activeFilterChips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />

              {activeFilterChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 py-1 pl-2.5 pr-1.5 text-xs font-medium text-foreground"
                >
                  {chip.label}

                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Remove filter ${chip.label}`}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
          ) : null}

          {/* ---------------------------------------------------------- */}
          {/* BULK ACTIONS                                                */}
          {/* ---------------------------------------------------------- */}

          {selectedIds.size > 0 ? (
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} asset{selectedIds.size === 1 ? '' : 's'} selected
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Selected
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : null}

          {/* ---------------------------------------------------------- */}
          {/* TABLE                                                       */}
          {/* ---------------------------------------------------------- */}

          <div className="rounded-lg border">
            <div className="max-h-[65vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 px-3">
                      <SelectAllCheckbox
                        checked={allVisibleSelected}
                        indeterminate={someVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        disabled={paginatedAssets.length === 0}
                      />
                    </TableHead>

                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() =>
                        toggleSort(
                          'assetTag',
                        )
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        Asset
                        <SortIndicator active={sortKey === 'assetTag'} dir={sortDir} />
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
                        Device
                        <SortIndicator active={sortKey === 'hostName'} dir={sortDir} />
                      </span>
                    </TableHead>

                    <TableHead>
                      Current User
                    </TableHead>

                    <TableHead>
                      Department
                    </TableHead>

                    <TableHead>
                      Location
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
                        Warranty
                        <SortIndicator active={sortKey === 'warrantyExpiry'} dir={sortDir} />
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
                        <SortIndicator active={sortKey === 'status'} dir={sortDir} />
                      </span>
                    </TableHead>

                    <TableHead className="w-12 text-right">
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
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        {search || activeFilterChips.length > 0
                          ? 'No assets match your search or filters.'
                          : 'No assets found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAssets.map(
                      (asset) => (
                        <TableRow
                          key={asset.id}
                          data-state={selectedIds.has(asset.id) ? 'selected' : undefined}
                        >
                          <TableCell className="px-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(asset.id)}
                              onChange={() => toggleSelectOne(asset.id)}
                              aria-label={`Select ${asset.assetTag}`}
                              className="h-4 w-4 rounded border-input text-primary accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </TableCell>

                          <TableCell>
                            <button
                              type="button"
                              onClick={() => openView(asset)}
                              className="block text-left font-mono text-xs font-semibold text-primary hover:underline"
                            >
                              {asset.assetTag}
                            </button>

                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {[asset.manufacturer, asset.model]
                                .filter(Boolean)
                                .join(' ') || '—'}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="text-sm text-foreground">
                              {asset.hostName ?? '—'}
                            </div>

                            <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                              {asset.serialNumber ?? '—'}
                            </div>
                          </TableCell>

                          <TableCell>
                            {asset.assignedUserName ? (
                              <span className="text-sm text-foreground">
                                {asset.assignedUserName}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Unassigned
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <span className="text-sm text-foreground">
                              {asset.departmentName ?? '—'}
                            </span>
                          </TableCell>

                          <TableCell>
                            {asset.currentSeatLabel ? (
                              <span className="inline-flex items-center gap-1 text-sm text-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                {asset.currentSeatLabel}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell>
                            <WarrantyCell expiry={asset.warrantyExpiry} />
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusPill status={asset.status} />

                              {asset.ownershipType === 'Rented' && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-800"
                                  title={
                                    asset.vendorName
                                      ? `Rented from ${asset.vendorName}`
                                      : 'Rented asset'
                                  }
                                >
                                  <Truck className="h-3 w-3" aria-hidden />
                                  Rented
                                </span>
                              )}

                              {asset.dualMonitor && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800"
                                  title="Dual monitor setup"
                                >
                                  <Monitor className="h-3 w-3" aria-hidden />
                                  Dual Monitor
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label={`Actions for ${asset.assetTag}`}
                                >
                                  <Ellipsis className="h-4 w-4" />
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
                                  View Asset
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    openHistory(
                                      asset,
                                    )
                                  }
                                >
                                  <History className="mr-2 h-4 w-4" />
                                  Asset History
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
                                      Edit Asset
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
                                      Retire Asset
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
          </div>

          {/* ---------------------------------------------------------- */}
          {/* PAGINATION                                                  */}
          {/* ---------------------------------------------------------- */}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>

              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[72px]">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <span>
                {filteredAssets.length === 0
                  ? '0 of 0'
                  : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredAssets.length)} of ${filteredAssets.length}`}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
        vendors={vendors}
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
        currentWorkMode={
          selectedAsset?.currentWorkMode ?? null
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
