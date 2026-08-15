import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutateAction } from '@/lib/uibakery';
import { useAuth } from '@/lib/auth/auth-context';
import {
  Plus,
  UserX,
  PackageSearch,
  ClipboardList,
  CheckCircle2,
  KeyRound,
  CircleCheck,
  UserCheck,
  CalendarX,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KpiCard } from '@/components/layout/kpi-card';
import { AppRole, canManage, isTeamLeader as checkIsTeamLeader } from '@/lib/auth/roles';
import loadUnavailabilityPeriods from '@/actions/availability/loadUnavailabilityPeriods';
import loadAvailableResources from '@/actions/availability/loadAvailableResources';
import loadReallocationRequests from '@/actions/availability/loadReallocationRequests';


import { recordAvailabilityAudit } from '@/actions/availability/auditLog';

import { MarkUnavailableDialog } from '@/app/pages/availability/components/mark-unavailable-dialog';
import { AvailableResourcesTable } from '@/app/pages/availability/components/available-resources-table';
import { LicenseAvailabilityTable } from '@/app/pages/availability/components/license-availability-table';
import {
  getLicenses,
  type License,
} from '@/lib/api/licenses.api';

import { getUsers } from '@/lib/api/users.api';
import { getResourceAllocations } from '@/lib/api/resource-allocations.api';

import {
  createUnavailability as createUnavailabilityApi,
  cancelUnavailability as cancelUnavailabilityApi,
  createReallocationRequest as createReallocationRequestApi,
  decideReallocationRequest as decideReallocationRequestApi,
  returnReallocationToOriginalUser as returnReallocationToOriginalUserApi,
} from '@/lib/api/availability.api';
import { ReallocationRequestDialog } from '@/app/pages/availability/components/reallocation-request-dialog';
import { ReallocationApprovalDialog } from '@/app/pages/availability/components/reallocation-approval-dialog';
import { UnderutilizedReallocationDialog } from '@/app/pages/availability/components/underutilized-reallocation-dialog';
import {
  AvailableResource,
  LookupOption,
  ReallocationFormValues,
  ReallocationRequest,
  UnavailabilityFormValues,
  UnavailabilityPeriod,
  UnderutilizedCandidate,
  UnderutilizedReallocationFormValues,
} from '@/app/pages/availability/types';

function periodStatusPillClass(status: string): string {
  switch (status) {
    case 'Active':
      return 'nova-pill-success';
    case 'Upcoming':
      return 'nova-pill-pending';
    case 'Cancelled':
      return 'nova-pill-danger';
    default:
      return 'nova-pill-neutral';
  }
}

function requestStatusPillClass(status: string): string {
  switch (status) {
    case 'Approved':
      return 'nova-pill-success';
    case 'Pending':
      return 'nova-pill-pending';
    case 'Rejected':
      return 'nova-pill-danger';
    default:
      return 'nova-pill-neutral';
  }
}

export default function AvailabilityPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const { user: authenticatedUser } = useAuth();

  const canApprove = canManage(roles);
  const canMarkOrRequest =
    canManage(roles) || checkIsTeamLeader(roles);

  const actorName =
    authenticatedUser?.fullName ?? 'System';

  const actorUserId =
    authenticatedUser?.userId;

  const [licenses, setLicenses] = useState<License[]>([]);
  const [licensesLoading, setLicensesLoading] = useState(true);
  const [licensesError, setLicensesError] = useState('');

  const loadLicenseAvailability = async () => {
    setLicensesLoading(true);
    setLicensesError('');

    try {
      const data = await getLicenses();

      setLicenses(
        Array.isArray(data) ? data : []
      );
    } catch (error: any) {
      console.error(
        'Unable to load license availability:',
        error
      );

      setLicensesError(
        error?.response?.data?.message ||
        error?.message ||
        'Unable to load license availability.'
      );

      setLicenses([]);
    } finally {
      setLicensesLoading(false);
    }
  };

  const [periods, setPeriods] =
    useState<UnavailabilityPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] =
    useState(true);

  const [resources, setResources] =
    useState<AvailableResource[]>([]);
  const [resourcesLoading, setResourcesLoading] =
    useState(true);

  const [requests, setRequests] =
    useState<ReallocationRequest[]>([]);
  const [requestsLoading, setRequestsLoading] =
    useState(true);
  const [users, setUsers] = useState<LookupOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const loadAvailabilityUsers = async () => {
    setUsersLoading(true);

    try {
      const userData = await getUsers('', 1, 500);

      setUsers(
        Array.isArray(userData?.items)
          ? userData.items
              .filter((u) => u.isActive)
              .map((u) => ({
                id: u.id,
                name: u.fullName,
              }))
          : []
      );
    } catch (error) {
      console.error(
        'Unable to load availability users:',
        error
      );

      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    void loadLicenseAvailability();
    void loadAvailabilityUsers();
    void loadAvailabilityData();
  }, []);

  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [logAudit] = useMutateAction(recordAvailabilityAudit);

  const [markOpen, setMarkOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [underutilizedOpen, setUnderutilizedOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<AvailableResource | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ReallocationRequest | null>(null);
  const [preselectedCandidate, setPreselectedCandidate] =
    useState<UnderutilizedCandidate | null>(null);

  const [underutilizedCandidates, setUnderutilizedCandidates] =
    useState<UnderutilizedCandidate[]>([]);
  const [underutilizedRequesting, setUnderutilizedRequesting] =
    useState(false);

  const loadUnderutilizedCandidates = async () => {
    try {
      const allocations = await getResourceAllocations();

      setUnderutilizedCandidates(
        (Array.isArray(allocations) ? allocations : [])
          .filter(
            (a) =>
              a.isActive &&
              a.status?.toLowerCase() === 'allocated'
          )
          .map((a) => ({
            resource_allocation_id: a.id,
            license_id: a.licenseId,
            license_alias_code: a.licenseAliasCode,
            software_name: a.softwareName,
            current_user_id: a.userId,
            current_user_name: a.userName,
            asset_name: a.assetName,
          }))
      );
    } catch (error) {
      console.error(
        'Unable to load license allocations for the underutilization flow:',
        error
      );

      setUnderutilizedCandidates([]);
    }
  };

  const loadAvailabilityData = async () => {
    setPeriodsLoading(true);
    setResourcesLoading(true);
    setRequestsLoading(true);

    try {
      const [
        periodData,
        resourceData,
        requestData,
      ] = await Promise.all([
        loadUnavailabilityPeriods(),
        loadAvailableResources(),
        loadReallocationRequests(),
        loadUnderutilizedCandidates(),
      ]);

      setPeriods(
        Array.isArray(periodData) ? periodData : []
      );

      setResources(
        Array.isArray(resourceData) ? resourceData : []
      );

      setRequests(
        Array.isArray(requestData) ? requestData : []
      );
    } catch (error) {
      console.error(
        'Unable to load availability data:',
        error
      );
    } finally {
      setPeriodsLoading(false);
      setResourcesLoading(false);
      setRequestsLoading(false);
    }
  };

  const refreshAll = async () => {
    await loadAvailabilityData();
  };

  const safePeriods = Array.isArray(periods)
    ? periods
    : [];

  const safeResources = Array.isArray(resources)
    ? resources
    : [];

  const safeRequests = Array.isArray(requests)
    ? requests
    : [];

  // Operational view contains only periods requiring
  // current or future attention.
  // Reallocation operational queue:
  // Pending requests and Approved requests whose temporary
  // allocation is still active.
  const operationalRequests = safeRequests.filter(
    (r) =>
      r.status === 'Pending' ||
      (
        r.status === 'Approved' &&
        r.resulting_allocation_active === true
      )
  );

  // Reallocation history:
  // Returned, Rejected, and old Approved requests whose
  // resulting allocation is no longer active.
  const historicalRequests = safeRequests
    .filter(
      (r) =>
        r.status === 'Returned' ||
        r.status === 'Rejected' ||
        (
          r.status === 'Approved' &&
          r.resulting_allocation_active === false
        )
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

  const operationalPeriods = safePeriods.filter(
    (p) =>
      p.effective_status === 'Active' ||
      p.effective_status === 'Upcoming'
  );

  // Preserve completed/cancelled records for audit history.
  // Newest records are shown first.
  const historicalPeriods = safePeriods
    .filter(
      (p) =>
        p.effective_status === 'Ended' ||
        p.effective_status === 'Cancelled'
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

  const activeCount = safePeriods.filter(
    (p) => p.effective_status === 'Active'
  ).length;

  const upcomingCount = safePeriods.filter(
    (p) => p.effective_status === 'Upcoming'
  ).length;

  const pendingRequestCount = safeRequests.filter(
    (r) => r.status === 'Pending'
  ).length;

  const availableResourceCount = safeResources.length;

  // Central license inventory KPI calculations.
  // Expired and inactive licenses are excluded from Available/Allocated.
  const now = new Date();

  const totalLicenseCount = licenses.length;

  const activeLicenseCount = licenses.filter((license) => {
    const expiry = new Date(license.expiryDate);

    return (
      license.isActive &&
      !Number.isNaN(expiry.getTime()) &&
      expiry > now
    );
  }).length;

  const availableLicenseCount = licenses.filter((license) => {
    const expiry = new Date(license.expiryDate);

    return (
      license.isActive &&
      !Number.isNaN(expiry.getTime()) &&
      expiry > now &&
      license.status.toLowerCase() === 'available'
    );
  }).length;

  const allocatedLicenseCount = licenses.filter((license) => {
    const expiry = new Date(license.expiryDate);

    return (
      license.isActive &&
      !Number.isNaN(expiry.getTime()) &&
      expiry > now &&
      license.status.toLowerCase() === 'allocated'
    );
  }).length;

  const expiredLicenseCount = licenses.filter((license) => {
    const expiry = new Date(license.expiryDate);

    return (
      !Number.isNaN(expiry.getTime()) &&
      expiry <= now
    );
  }).length;

  const renewalAttentionCount = licenses.filter((license) => {
    if (!license.isActive) {
      return false;
    }

    const expiry = new Date(license.expiryDate);

    if (Number.isNaN(expiry.getTime())) {
      return false;
    }

    const todayUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );

    const expiryUtc = Date.UTC(
      expiry.getUTCFullYear(),
      expiry.getUTCMonth(),
      expiry.getUTCDate()
    );

    const daysRemaining = Math.ceil(
      (expiryUtc - todayUtc) / 86400000
    );

    return daysRemaining <= 30;
  }).length;

  const handleMarkUnavailable = async (
    values: UnavailabilityFormValues
  ) => {
    if (!actorUserId) {
      throw new Error(
        'Unable to identify the logged-in user.'
      );
    }

    const payload = {
      userId: Number(values.userId),
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason.trim(),
      createdByUserId: actorUserId,
    };

    try {
      setSaving(true);

      const created =
        await createUnavailabilityApi(payload);

      await logAudit({
        tableName: 'UserUnavailabilities',
        recordId: created.id,
        action: 'INSERT',
        oldValues: null,
        newValues: JSON.stringify(created),
        actorName,
      });

      setMarkOpen(false);

      await refreshAll();
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPeriod = async (
    period: UnavailabilityPeriod
  ) => {
    if (!actorUserId) {
      throw new Error(
        'Unable to identify the logged-in user.'
      );
    }

    try {
      setCancelling(true);

      await cancelUnavailabilityApi(
        period.id,
        {
          cancelledByUserId: actorUserId,
        }
      );

      await logAudit({
        tableName: 'UserUnavailabilities',
        recordId: period.id,
        action: 'CANCEL',
        oldValues: JSON.stringify(period),
        newValues: JSON.stringify({
          status: 'Cancelled',
          cancelledByUserId: actorUserId,
        }),
        actorName,
      });

      await refreshAll();
    } finally {
      setCancelling(false);
    }
  };

  const openRequestDialog = (resource: AvailableResource) => {
    setSelectedResource(resource);
    setRequestOpen(true);
  };

  const handleCreateRequest = async (
    values: ReallocationFormValues
  ) => {
    if (!selectedResource) {
      return;
    }

    if (!actorUserId) {
      throw new Error(
        'Unable to identify the logged-in user.'
      );
    }

    if (
      selectedResource.resource_type !== 'License' ||
      !selectedResource.license_allocation_id
    ) {
      throw new Error(
        'A valid license allocation is required for reallocation.'
      );
    }

    const payload = {
      userUnavailabilityId:
        selectedResource.unavailability_id,

      resourceAllocationId:
        selectedResource.license_allocation_id,

      targetUserId:
        Number(values.targetUserId),

      requestedByUserId:
        actorUserId,

      remarks:
        values.justification.trim() || null,
    };

    try {
      setRequesting(true);

      const created =
        await createReallocationRequestApi(payload);

      await logAudit({
        tableName: 'ResourceReallocationRequests',
        recordId: created.id,
        action: 'INSERT',
        oldValues: null,
        newValues: JSON.stringify(created),
        actorName,
      });

      setRequestOpen(false);
      setSelectedResource(null);

      await refreshAll();
    } finally {
      setRequesting(false);
    }
  };

  const openUnderutilizedDialog = (
    candidate: UnderutilizedCandidate | null = null
  ) => {
    setPreselectedCandidate(candidate);
    setUnderutilizedOpen(true);
  };

  const handleCreateUnderutilizedRequest = async (
    values: UnderutilizedReallocationFormValues
  ) => {
    if (!actorUserId) {
      throw new Error(
        'Unable to identify the logged-in user.'
      );
    }

    const resourceAllocationId = Number(values.resourceAllocationId);

    if (!resourceAllocationId) {
      throw new Error(
        'Select the license this request is for.'
      );
    }

    const payload = {
      userUnavailabilityId: null,
      requestReason: 'Underutilization',

      resourceAllocationId,

      targetUserId:
        Number(values.targetUserId),

      requestedByUserId:
        actorUserId,

      remarks:
        values.justification.trim(),
    };

    try {
      setUnderutilizedRequesting(true);

      const created =
        await createReallocationRequestApi(payload);

      await logAudit({
        tableName: 'ResourceReallocationRequests',
        recordId: created.id,
        action: 'INSERT',
        oldValues: null,
        newValues: JSON.stringify(created),
        actorName,
      });

      setUnderutilizedOpen(false);
      setPreselectedCandidate(null);

      await refreshAll();
    } finally {
      setUnderutilizedRequesting(false);
    }
  };

  const handleReturnToOriginalUser = async (
    request: ReallocationRequest
  ) => {
    if (!actorUserId) {
      window.alert(
        'Unable to identify the logged-in user.'
      );
      return;
    }

    if (
      request.status !== 'Approved' ||
      !request.resulting_allocation_id ||
      request.resulting_allocation_active !== true
    ) {
      window.alert(
        'This temporary allocation cannot be returned.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Return ${request.software_name ?? 'this license'} from ` +
      `${request.target_user_name ?? 'temporary user'} to ` +
      `${request.source_user_name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeciding(true);

      const returned =
        await returnReallocationToOriginalUserApi(
          request.id,
          {
            returnedByUserId: actorUserId,
            remarks:
              `Temporary allocation returned to ${request.source_user_name}`,
          }
        );

      await logAudit({
        tableName: 'ResourceReallocationRequests',
        recordId: request.id,
        action: 'RETURN',
        oldValues: JSON.stringify(request),
        newValues: JSON.stringify(returned),
        actorName,
      });

      await refreshAll();

    } catch (error) {
      console.error(
        'Unable to return temporary allocation:',
        error
      );

      window.alert(
        'Unable to return the temporary allocation. Please check the API logs.'
      );

    } finally {
      setDeciding(false);
    }
  };

  const openApprovalDialog = (request: ReallocationRequest) => {
    setSelectedRequest(request);
    setApprovalOpen(true);
  };

  const handleDecide = async (
    decision: 'Approved' | 'Rejected',
    values: { decisionNotes: string }
  ) => {
    if (!selectedRequest) {
      return;
    }

    if (!actorUserId) {
      throw new Error(
        'Unable to identify the logged-in user.'
      );
    }

    const payload = {
      decidedByUserId: actorUserId,
      approve: decision === 'Approved',
      decisionRemarks:
        values.decisionNotes.trim() || null,
    };

    try {
      setDeciding(true);

      const decided =
        await decideReallocationRequestApi(
          selectedRequest.id,
          payload
        );

      await logAudit({
        tableName: 'ResourceReallocationRequests',
        recordId: selectedRequest.id,
        action:
          decision === 'Approved'
            ? 'APPROVE'
            : 'REJECT',
        oldValues: JSON.stringify(selectedRequest),
        newValues: JSON.stringify(decided),
        actorName,
      });

      setApprovalOpen(false);
      setSelectedRequest(null);

      await refreshAll();
    } finally {
      setDeciding(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Currently Unavailable" value={activeCount} icon={UserX} hint="Users away right now" />
        <KpiCard title="Upcoming Unavailability" value={upcomingCount} icon={UserX} hint="Scheduled future windows" />
        <KpiCard title="Available Resources" value={availableResourceCount} icon={PackageSearch} hint="Freed systems & seats" />
        <KpiCard
          title="Pending Reallocation Requests"
          value={pendingRequestCount}
          icon={ClipboardList}
          hint="Awaiting IT approval"
          tone={pendingRequestCount > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Licenses"
          value={totalLicenseCount}
          icon={KeyRound}
          hint={`${activeLicenseCount} currently active`}
        />

        <KpiCard
          title="Available Licenses"
          value={availableLicenseCount}
          icon={CircleCheck}
          hint="Ready for allocation"
        />

        <KpiCard
          title="Allocated Licenses"
          value={allocatedLicenseCount}
          icon={UserCheck}
          hint="Currently assigned"
        />

        <KpiCard
          title="Renewal Attention"
          value={renewalAttentionCount}
          icon={CalendarX}
          hint={
            expiredLicenseCount > 0
              ? `${expiredLicenseCount} expired`
              : 'Expired or due within 30 days'
          }
          tone={
            renewalAttentionCount > 0
              ? 'warning'
              : 'default'
          }
        />
      </div>

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div>
            <div className="text-sm font-semibold text-foreground">License Availability</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Current availability of individual software licenses from the central license inventory.
            </p>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {licensesError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {licensesError}
            </div>
          ) : null}

          <LicenseAvailabilityTable
            licenses={licenses}
            loading={licensesLoading}
          />
        </div>
      </div>

      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Temporary Resource Availability</h1>
          <p className="nova-cmdbar-desc">
            Mark users unavailable to free up their systems and license seats for temporary sharing. Reallocation
            always requires IT Administrator approval.
          </p>
        </div>
        {canMarkOrRequest ? (
          <div className="nova-cmdbar-actions">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openUnderutilizedDialog(null)}
            >
              <TrendingDown className="mr-1.5 h-4 w-4" />
              Flag Underutilized License
            </Button>
            <Button size="sm" onClick={() => setMarkOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Mark User Unavailable
            </Button>
          </div>
        ) : null}
      </div>

      <div className="nova-panel">
        <div className="p-4">
          <Tabs defaultValue="available">
            <TabsList>
              <TabsTrigger value="available">Available Resources</TabsTrigger>
              <TabsTrigger value="periods">Unavailability Periods</TabsTrigger>
              <TabsTrigger value="requests">Reallocation Requests</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="mt-4">
              <AvailableResourcesTable
                resources={safeResources}
                loading={resourcesLoading}
                canRequest={canMarkOrRequest}
                onRequest={openRequestDialog}
              />
            </TabsContent>

            <TabsContent value="periods" className="mt-4">
              <div className="nova-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Department</th>
                      <th>Window</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th className="nova-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodsLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          Loading unavailability periods…
                        </td>
                      </tr>
                    ) : operationalPeriods.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          No active or upcoming unavailability periods.
                        </td>
                      </tr>
                    ) : (
                      operationalPeriods.map((p) => (
                        <tr key={p.id}>
                          <td className="font-medium">{p.user_name}</td>
                          <td className="nova-cell-sub">{p.department_name ?? '—'}</td>
                          <td className="nova-cell-sub">
                            {p.start_date} → {p.end_date}
                          </td>
                          <td className="max-w-[220px] truncate nova-cell-faint">{p.reason}</td>
                          <td>
                            <span className={`nova-pill ${periodStatusPillClass(p.effective_status)}`}>
                              <span className="nova-dot" />
                              {p.effective_status}
                            </span>
                          </td>
                          <td className="nova-right">
                            {canMarkOrRequest && p.status === 'Active' ? (
                              <Button variant="ghost" size="sm" disabled={cancelling} onClick={() => handleCancelPeriod(p)}>
                                End Now
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <div className="nova-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Department</th>
                      <th>Window</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {periodsLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          Loading history…
                        </td>
                      </tr>
                    ) : historicalPeriods.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No unavailability history yet.
                        </td>
                      </tr>
                    ) : (
                      historicalPeriods.map((p) => (
                        <tr key={p.id}>
                          <td className="font-medium">
                            {p.user_name}
                          </td>

                          <td className="nova-cell-sub">
                            {p.department_name ?? '—'}
                          </td>

                          <td className="nova-cell-sub">
                            {p.start_date} → {p.end_date}
                          </td>

                          <td className="max-w-[220px] truncate nova-cell-faint">
                            {p.reason}
                          </td>

                          <td>
                            <span
                              className={`nova-pill ${periodStatusPillClass(
                                p.effective_status
                              )}`}
                            >
                              <span className="nova-dot" />
                              {p.effective_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold">
                    Reallocation History
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Returned, rejected, and superseded temporary
                    license reallocations.
                  </p>
                </div>

                <div className="nova-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Resource</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Requested By</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {requestsLoading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-8 text-center text-sm text-muted-foreground"
                          >
                            Loading reallocation history…
                          </td>
                        </tr>
                      ) : historicalRequests.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-8 text-center text-sm text-muted-foreground"
                          >
                            No reallocation history yet.
                          </td>
                        </tr>
                      ) : (
                        historicalRequests.map((r) => {
                          const isSuperseded =
                            r.status === 'Approved' &&
                            r.resulting_allocation_active === false;

                          const displayStatus =
                            isSuperseded
                              ? 'Superseded'
                              : r.status;

                          return (
                            <tr key={r.id}>
                              <td>
                                <div className="font-medium">
                                  {r.resource_type === 'Asset'
                                    ? r.asset_tag
                                    : r.software_name}
                                </div>

                                <div className="nova-cell-faint">
                                  {r.resource_type}
                                </div>
                              </td>

                              <td className="nova-cell-sub">
                                {r.source_user_name}
                              </td>

                              <td className="nova-cell-sub">
                                {r.target_user_name ?? '—'}
                              </td>

                              <td className="nova-cell-sub">
                                {r.requested_by ?? '—'}
                              </td>

                              <td>
                                {isSuperseded ? (
                                  <span className="nova-pill nova-pill-neutral">
                                    <span className="nova-dot" />
                                    Superseded
                                  </span>
                                ) : (
                                  <span
                                    className={`nova-pill ${requestStatusPillClass(
                                      r.status
                                    )}`}
                                  >
                                    <span className="nova-dot" />
                                    {displayStatus}
                                  </span>
                                )}
                              </td>

                              <td className="nova-cell-faint">
                                {r.returned_at ??
                                  r.decided_at ??
                                  r.created_at}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              <div className="nova-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Resource</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Reason</th>
                      <th>Requested By</th>
                      <th>Status</th>
                      <th className="nova-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestsLoading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                          Loading reallocation requests…
                        </td>
                      </tr>
                    ) : operationalRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                          No pending or active reallocation requests.
                        </td>
                      </tr>
                    ) : (
                      operationalRequests.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <div className="font-medium">
                              {r.resource_type === 'Asset' ? r.asset_tag : r.software_name}
                            </div>
                            <div className="nova-cell-faint">{r.resource_type}</div>
                          </td>
                          <td className="nova-cell-sub">{r.source_user_name}</td>
                          <td className="nova-cell-sub">{r.target_user_name ?? '—'}</td>
                          <td>
                            <span
                              className={`nova-pill ${
                                r.reallocation_reason === 'Underutilization'
                                  ? 'nova-pill-info'
                                  : 'nova-pill-neutral'
                              }`}
                            >
                              <span className="nova-dot" />
                              {r.reallocation_reason === 'Underutilization'
                                ? 'Underutilized'
                                : 'Unavailability'}
                            </span>
                          </td>
                          <td className="nova-cell-sub">{r.requested_by ?? '—'}</td>
                          <td>
                            <span className={`nova-pill ${requestStatusPillClass(r.status)}`}>
                              <span className="nova-dot" />
                              {r.status}
                            </span>
                          </td>
                          <td className="nova-right">
                            {canApprove && r.status === 'Pending' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openApprovalDialog(r)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Review
                              </Button>
                            ) : canApprove &&
                              r.reallocation_reason !== 'Underutilization' &&
                              r.status === 'Approved' &&
                              r.resulting_allocation_id &&
                              r.resulting_allocation_active === true ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={deciding}
                                onClick={() =>
                                  handleReturnToOriginalUser(r)
                                }
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Return to {r.source_user_name}
                              </Button>
                            ) : r.status === 'Returned' ? (
                              <span className="nova-pill nova-pill-neutral">
                                <span className="nova-dot" />
                                Returned
                              </span>
                            ) : r.status === 'Approved' &&
                              r.reallocation_reason === 'Underutilization' ? (
                              <span className="nova-pill nova-pill-neutral">
                                <span className="nova-dot" />
                                Permanent
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MarkUnavailableDialog open={markOpen} onOpenChange={setMarkOpen} saving={saving} users={users} onSubmit={handleMarkUnavailable} />

      <ReallocationRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        saving={requesting}
        resource={selectedResource}
        users={users}
        onSubmit={handleCreateRequest}
      />

      <ReallocationApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        request={selectedRequest}
        saving={deciding}
        onDecide={handleDecide}
      />

      <UnderutilizedReallocationDialog
        open={underutilizedOpen}
        onOpenChange={setUnderutilizedOpen}
        saving={underutilizedRequesting}
        candidates={underutilizedCandidates}
        users={users}
        preselected={preselectedCandidate}
        onSubmit={handleCreateUnderutilizedRequest}
      />
    </div>
  );
}
