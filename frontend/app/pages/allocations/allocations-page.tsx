import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
import { Plus, Search, Repeat, Undo2, History, KeySquare, Timer, CalendarClock, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KpiCard } from '@/components/layout/kpi-card';
import { AppRole, canManage } from '@/lib/auth/roles';
import loadAllocations from '@/actions/allocations/loadAllocations';
import loadAllocationStats from '@/actions/allocations/loadAllocationStats';
import {
  loadSoftwareWithAvailability,
  loadUsersForAllocations,
  loadComputersForAllocations,
  loadEntitiesForAllocations,
  loadClientsForAllocations,
} from '@/actions/allocations/loadAllocationLookups';
import createAllocation from '@/actions/allocations/createAllocation';
import transferAllocation from '@/actions/allocations/transferAllocation';
import releaseAllocation from '@/actions/allocations/releaseAllocation';
import { recordAllocationAudit } from '@/actions/allocations/auditLog';
import { AllocationTransferDialog, TransferFormValues } from '@/app/pages/allocations/components/allocation-transfer-dialog';
import {
  ResourceAllocationTransferDialog,
  type ResourceTransferValues,
} from '@/app/pages/allocations/components/resource-allocation-transfer-dialog';

import { AllocationReleaseDialog, ReleaseFormValues } from '@/app/pages/allocations/components/allocation-release-dialog';
import { AllocationHistoryDialog } from '@/app/pages/allocations/components/allocation-history-dialog';
import { ResourceAllocationHistoryDialog } from '@/app/pages/allocations/components/resource-allocation-history-dialog';
import {
  AllocationRecord,
  AllocationFormValues,
  AllocationStats,
  SoftwareAvailabilityOption,
  LookupOption,
} from '@/app/pages/allocations/types';

import {
  ResourceAllocation,
  getResourceAllocations,
  createResourceAllocation,
  releaseResourceAllocation,
  transferResourceAllocation,
} from '@/lib/api/resource-allocations.api';

import {
  getLicenses,
  type License,
} from '@/lib/api/licenses.api';

import {
  getUsers,
  type User as ApiUser,
} from '@/lib/api/users.api';

import {
  getAssets,
  type Asset,
} from '@/lib/api/assets.api';

import { useAuth } from '@/lib/auth/auth-context';

import {
  AllocationFormDialog,
  type ApiAllocationFormValues,
} from '@/app/pages/allocations/components/allocation-form-dialog';

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Active':
      return 'default';
    case 'Released':
      return 'outline';
    default:
      return 'secondary';
  }
}

function targetLabel(record: AllocationRecord): string {
  switch (record.allocation_type) {
    case 'User':
      return record.user_name ?? '—';
    case 'Computer':
      return record.computer_name ?? record.asset_tag ?? '—';
    case 'Entity':
      return record.entity_name ?? '—';
    case 'Client':
      return record.client_name ?? '—';
    default:
      return '—';
  }
}

export default function AllocationsPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const { user: authenticatedUser } = useAuth();

  const [availableLicenses, setAvailableLicenses] =
    useState<License[]>([]);

  const [apiUsers, setApiUsers] =
    useState<ApiUser[]>([]);

  const [apiAssets, setApiAssets] =
    useState<Asset[]>([]);

  const [savingApiAllocation, setSavingApiAllocation] =
    useState(false);
  const user = useUser();
  const canEdit = canManage(roles);
  const actorName = user?.name ?? 'System';

  const [resourceAllocations, setResourceAllocations] =
    useState<ResourceAllocation[]>([]);
  const [resourceAllocationsLoading, setResourceAllocationsLoading] =
    useState(true);
  const [resourceAllocationsError, setResourceAllocationsError] =
    useState('');

  const loadApiAllocationLookups = async () => {
    try {
      const [licenseData, userData, assetData] =
        await Promise.all([
          getLicenses(),
          getUsers('', 1, 500),
          getAssets(),
        ]);

      const now = new Date();

      setAvailableLicenses(
        (Array.isArray(licenseData) ? licenseData : [])
          .filter((license) => {
            const expiry = new Date(license.expiryDate);

            return (
              license.isActive &&
              license.status.toLowerCase() === 'available' &&
              !Number.isNaN(expiry.getTime()) &&
              expiry > now
            );
          })
      );

      setApiUsers(
        Array.isArray(userData?.items)
          ? userData.items.filter((u) => u.isActive)
          : []
      );

      setApiAssets(
        (Array.isArray(assetData) ? assetData : [])
          .filter((asset) => asset.isActive)
      );
    } catch (error) {
      console.error(
        'Unable to load allocation form lookups:',
        error
      );

      setAvailableLicenses([]);
      setApiUsers([]);
      setApiAssets([]);
    }
  };

  const loadResourceAllocations = async () => {
    setResourceAllocationsLoading(true);
    setResourceAllocationsError('');

    try {
      const data = await getResourceAllocations();
      setResourceAllocations(data);
    } catch (err: any) {
      setResourceAllocationsError(
        err?.response?.data?.message ||
          'Unable to load resource allocations.',
      );
    } finally {
      setResourceAllocationsLoading(false);
    }
  };

  useEffect(() => {
    void loadResourceAllocations();
    void loadApiAllocationLookups();
  }, []);

  const [allocations, loading, , reload]: [AllocationRecord[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(loadAllocations, [], {});
  const [stats]: [AllocationStats | null, boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadAllocationStats,
    null,
    {},
  );
  const [softwareOptions, , , reloadSoftware]: [SoftwareAvailabilityOption[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(loadSoftwareWithAvailability, [], {});
  const [users]: [LookupOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadUsersForAllocations,
    [],
    {},
  );
  const [computers]: [LookupOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadComputersForAllocations,
    [],
    {},
  );
  const [entities]: [LookupOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadEntitiesForAllocations,
    [],
    {},
  );
  const [clients]: [LookupOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadClientsForAllocations,
    [],
    {},
  );

  const [saveAllocation, saving] = useMutateAction(createAllocation);
  const [transferAlloc, transferring] = useMutateAction(transferAllocation);
  const [releaseAlloc, releasing] = useMutateAction(releaseAllocation);
  const [logAudit] = useMutateAction(recordAllocationAudit);

  const [transferringApiAllocation, setTransferringApiAllocation] = useState(false);

  const [resourceHistoryOpen, setResourceHistoryOpen] = useState(false);
  const [historyResourceAllocation, setHistoryResourceAllocation] =
    useState<ResourceAllocation | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selected, setSelected] = useState<AllocationRecord | null>(null);

  const [
    selectedResourceAllocation,
    setSelectedResourceAllocation,
  ] = useState<ResourceAllocation | null>(null);

  const [
    releasingApiAllocation,
    setReleasingApiAllocation,
  ] = useState(false);

  const refreshAll = async () => {
    await Promise.all([reload(), reloadSoftware()]);
  };

  const filteredAllocations = useMemo(() => {
    let list = Array.isArray(allocations)
      ? [...allocations]
      : [];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) =>
        [a.software_name, a.vendor, a.user_name, a.computer_name, a.asset_tag, a.entity_name, a.client_name, a.notes]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q)),
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      list = list.filter((a) => a.allocation_type === typeFilter);
    }

    return list;
  }, [allocations, search, statusFilter, typeFilter]);

  const filteredResourceAllocations = useMemo(() => {
    // Main Allocations table shows only the current active
    // allocation for each license. Released/transferred records
    // remain in the database and are available through History.
    let list = Array.isArray(resourceAllocations)
      ? resourceAllocations.filter(
          (allocation) =>
            allocation.isActive &&
            allocation.status === 'Allocated'
        )
      : [];

    if (search.trim()) {
      const q = search.trim().toLowerCase();

      list = list.filter((allocation) =>
        [
          allocation.licenseAliasCode,
          allocation.softwareName,
          allocation.userName,
          allocation.assetName,
          allocation.allocatedBy,
          allocation.status,
          allocation.remarks,
        ]
          .filter(Boolean)
          .some((field) =>
            String(field).toLowerCase().includes(q)
          )
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter(
        (allocation) => allocation.status === statusFilter
      );
    }

    return list;
  }, [resourceAllocations, search, statusFilter]);

  const resourceStats = useMemo(() => {
    const list = Array.isArray(resourceAllocations)
      ? resourceAllocations
      : [];

    const now = new Date();
    const soon = new Date();
    soon.setDate(now.getDate() + 30);

    return {
      active: list.filter(
        (x) => x.isActive && x.status === 'Allocated'
      ).length,

      dueSoon: list.filter((x) => {
        if (!x.isActive || !x.expectedReturnDate) {
          return false;
        }

        const due = new Date(x.expectedReturnDate);

        return due >= now && due <= soon;
      }).length,

      released: list.filter(
        (x) => x.status === 'Released'
      ).length,

      total: list.length,
    };
  }, [resourceAllocations]);

  const formatAllocationDate = (
    value: string | null | undefined
  ) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-IN');
  };

  const openAllocate = () => {
    setFormOpen(true);
  };

  const openTransfer = (record: AllocationRecord) => {
    setSelected(record);
    setTransferOpen(true);
  };

  const openRelease = (record: AllocationRecord) => {
    setSelected(record);
    setReleaseOpen(true);
  };

  const openHistory = (record: AllocationRecord) => {
    setSelected(record);
    setHistoryOpen(true);
  };

  const handleApiAllocate = async (
    values: ApiAllocationFormValues
  ) => {
    if (!authenticatedUser?.userId) {
      throw new Error(
        'Unable to identify the logged-in user.'
      );
    }

    try {
      setSavingApiAllocation(true);
      setResourceAllocationsError('');

      await createResourceAllocation({
        licenseId: Number(values.licenseId),
        userId: Number(values.userId),

        assetId:
          values.assetId &&
          values.assetId !== 'none'
            ? Number(values.assetId)
            : null,

        allocatedByUserId:
          authenticatedUser.userId,

        expectedReturnDate:
          values.expectedReturnDate
            ? `${values.expectedReturnDate}T00:00:00Z`
            : null,

        remarks:
          values.remarks.trim() || null,
      });

      setFormOpen(false);

      await Promise.all([
        loadResourceAllocations(),
        loadApiAllocationLookups(),
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        error?.response?.data ||
        error?.message ||
        'Unable to allocate license.';

      setResourceAllocationsError(
        typeof message === 'string'
          ? message
          : 'Unable to allocate license.'
      );
    } finally {
      setSavingApiAllocation(false);
    }
  };

  const handleApiTransfer = async (
    values: ResourceTransferValues
  ) => {
    if (!selectedResourceAllocation) {
      return;
    }

    if (!authenticatedUser?.userId) {
      throw new Error(
        'Unable to identify the logged-in user.'
      );
    }

    try {
      setTransferringApiAllocation(true);
      setResourceAllocationsError('');

      await transferResourceAllocation(
        selectedResourceAllocation.id,
        {
          newUserId: values.newUserId,
          newAssetId: values.newAssetId,
          transferredByUserId:
            authenticatedUser.userId,
          expectedReturnDate:
            values.expectedReturnDate,
          remarks: values.remarks,
        }
      );

      setTransferOpen(false);
      setSelectedResourceAllocation(null);

      await Promise.all([
        loadResourceAllocations(),
        loadApiAllocationLookups(),
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        error?.response?.data ||
        error?.message ||
        'Unable to transfer license.';

      setResourceAllocationsError(
        typeof message === 'string'
          ? message
          : 'Unable to transfer license.'
      );
    } finally {
      setTransferringApiAllocation(false);
    }
  };

  const handleAllocate = async (values: AllocationFormValues) => {
    const payload = {
      licenseInventoryId: values.licenseInventoryId,
      allocationType: values.allocationType,
      userId: values.allocationType === 'User' ? values.userId : null,
      assetId: values.allocationType === 'Computer' ? values.assetId : null,
      entityId: values.allocationType === 'Entity' ? values.entityId : null,
      clientId: values.allocationType === 'Client' ? values.clientId : null,
      allocationDate: values.allocationDate,
      isTemporary: values.isTemporary,
      shareEndDate: values.isTemporary ? values.shareEndDate || null : null,
      notes: values.notes || null,
      actorName,
    };
    await saveAllocation(payload);
    await logAudit({
      recordId: null,
      action: 'INSERT',
      oldValues: null,
      newValues: JSON.stringify(payload),
      actorName,
    });
    setFormOpen(false);
    await refreshAll();
  };

  const handleTransfer = async (values: TransferFormValues) => {
    if (!selected) return;
    const payload = {
      id: selected.id,
      allocationType: values.allocationType,
      userId: values.allocationType === 'User' ? values.userId : null,
      assetId: values.allocationType === 'Computer' ? values.assetId : null,
      entityId: values.allocationType === 'Entity' ? values.entityId : null,
      clientId: values.allocationType === 'Client' ? values.clientId : null,
      notes: values.notes || null,
      actorName,
    };
    await transferAlloc(payload);
    await logAudit({
      recordId: selected.id,
      action: 'TRANSFER',
      oldValues: JSON.stringify(selected),
      newValues: JSON.stringify(payload),
      actorName,
    });
    setTransferOpen(false);
    await refreshAll();
  };

  const handleApiRelease = async (
    values: ReleaseFormValues
  ) => {
    if (!selectedResourceAllocation) {
      return;
    }

    try {
      setReleasingApiAllocation(true);
      setResourceAllocationsError('');

      await releaseResourceAllocation(
        selectedResourceAllocation.id,
        {
          remarks: values.remarks?.trim() || null,
        }
      );

      setReleaseOpen(false);
      setSelectedResourceAllocation(null);

      await Promise.all([
        loadResourceAllocations(),
        loadApiAllocationLookups(),
      ]);
    } catch (error: any) {
      console.error(
        'Unable to release allocation:',
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        error?.response?.data ||
        error?.message ||
        'Unable to release license.';

      setResourceAllocationsError(
        typeof message === 'string'
          ? message
          : 'Unable to release license.'
      );
    } finally {
      setReleasingApiAllocation(false);
    }
  };

  const handleRelease = async (values: ReleaseFormValues) => {
    if (!selected) return;
    const payload = { id: selected.id, releaseDate: values.releaseDate, notes: values.notes || null, actorName };
    await releaseAlloc(payload);
    await logAudit({
      recordId: selected.id,
      action: 'RELEASE',
      oldValues: JSON.stringify(selected),
      newValues: JSON.stringify(payload),
      actorName,
    });
    setReleaseOpen(false);
    await refreshAll();
  };

  return (
    <div className="flex flex-col gap-5">
      {resourceAllocationsError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {resourceAllocationsError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Active Allocations"
          value={resourceStats.active}
          icon={PackageCheck}
          hint="Licenses currently assigned"
        />

        <KpiCard
          title="Due Soon"
          value={resourceStats.dueSoon}
          icon={CalendarClock}
          hint="Expected return within 30 days"
        />

        <KpiCard
          title="Released Allocations"
          value={resourceStats.released}
          icon={KeySquare}
          hint="Licenses returned to available pool"
        />

        <KpiCard
          title="Total Allocation History"
          value={resourceStats.total}
          icon={History}
          hint="All allocation lifecycle records"
        />
      </div>

      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">License Allocations</h1>
          <p className="nova-cmdbar-desc">
            Allocate and manage individual software licenses across employees and assigned devices.
          </p>
        </div>

        {canEdit ? (
          <div className="nova-cmdbar-actions">
            <Button size="sm" onClick={openAllocate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Allocate License
            </Button>
          </div>
        ) : null}
      </div>

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search license, software, employee or asset…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All Statuses
              </SelectItem>

              <SelectItem value="Allocated">
                Allocated
              </SelectItem>

              <SelectItem value="Released">
                Released
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filteredResourceAllocations.length} allocation{filteredResourceAllocations.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>License</th>
                <th>Software</th>
                <th>Allocated To</th>
                <th>Asset</th>
                <th>Allocated On</th>
                <th>Expected Return</th>
                <th>Returned On</th>
                <th>Status</th>
                <th>Allocated By</th>
                <th className="nova-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {resourceAllocationsLoading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading allocations…
                  </td>
                </tr>
              ) : filteredResourceAllocations.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No allocations found.
                  </td>
                </tr>
              ) : (
                filteredResourceAllocations.map((allocation) => (
                  <tr key={allocation.id}>
                    <td className="nova-mono">
                      {allocation.licenseAliasCode}
                    </td>

                    <td>
                      {allocation.softwareName}
                    </td>

                    <td className="nova-cell-sub">
                      {allocation.userName}
                    </td>

                    <td className="nova-cell-sub">
                      {allocation.assetName || '—'}
                    </td>

                    <td className="nova-cell-faint">
                      {formatAllocationDate(
                        allocation.allocatedOn
                      )}
                    </td>

                    <td className="nova-cell-faint">
                      {formatAllocationDate(
                        allocation.expectedReturnDate
                      )}
                    </td>

                    <td className="nova-cell-faint">
                      {formatAllocationDate(
                        allocation.actualReturnDate
                      )}
                    </td>

                    <td>
                      <span
                        className={`nova-pill ${allocation.status === 'Allocated' ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {allocation.status}
                      </span>
                    </td>

                    <td className="nova-cell-sub">
                      {allocation.allocatedBy}
                    </td>

                    <td className="nova-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setHistoryResourceAllocation(
                              allocation
                            );
                            setResourceHistoryOpen(true);
                          }}
                        >
                          <History className="mr-1 h-4 w-4" />
                          History
                        </Button>

                        {canEdit &&
                        allocation.isActive &&
                        allocation.status === 'Allocated' ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedResourceAllocation(
                                  allocation
                                );
                                setTransferOpen(true);
                              }}
                            >
                              Transfer
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedResourceAllocation(
                                  allocation
                                );
                                setReleaseOpen(true);
                              }}
                            >
                              Release
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AllocationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        saving={savingApiAllocation}
        licenses={availableLicenses}
        users={apiUsers}
        assets={apiAssets}
        onSubmit={handleApiAllocate}
      />

      <AllocationTransferDialog
        open={transferOpen && selected !== null}
        onOpenChange={setTransferOpen}
        record={selected}
        saving={transferring}
        users={users}
        computers={computers}
        entities={entities}
        clients={clients}
        onSubmit={handleTransfer}
      />

      <ResourceAllocationTransferDialog
        open={
          transferOpen &&
          selectedResourceAllocation !== null
        }
        onOpenChange={(open) => {
          setTransferOpen(open);

          if (!open) {
            setSelectedResourceAllocation(null);
          }
        }}
        allocation={selectedResourceAllocation}
        users={apiUsers}
        assets={apiAssets}
        saving={transferringApiAllocation}
        onSubmit={handleApiTransfer}
      />

      <AllocationReleaseDialog
        open={releaseOpen}
        onOpenChange={(open) => {
          setReleaseOpen(open);

          if (!open) {
            setSelectedResourceAllocation(null);
          }
        }}
        record={selectedResourceAllocation}
        saving={releasingApiAllocation}
        onSubmit={handleApiRelease}
      />

      <ResourceAllocationHistoryDialog
        open={resourceHistoryOpen}
        onOpenChange={(open) => {
          setResourceHistoryOpen(open);

          if (!open) {
            setHistoryResourceAllocation(null);
          }
        }}
        allocation={historyResourceAllocation}
      />

      <AllocationHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} record={selected} />
    </div>
  );
}
