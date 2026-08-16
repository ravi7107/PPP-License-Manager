import { useMemo, useState } from 'react';
import { useLoadAction, useMutateAction } from '@/lib/uibakery';
import { useAuth } from '@/lib/auth/auth-context';
import { Plus, FileText, History, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/layout/kpi-card';
import loadRequests from '@/actions/requests/loadRequests';
import createRequest from '@/actions/requests/createRequest';
import cancelRequest from '@/actions/requests/cancelRequest';
import notifyApprovers from '@/actions/requests/notifyApprovers';
import loadSoftwareForRequests from '@/actions/requests/loadSoftwareForRequests';
import loadDepartmentsForRequests from '@/actions/requests/loadDepartmentsForRequests';
import loadUsersForRequests from '@/actions/requests/loadUsersForRequests';
import loadComputersForRequests from '@/actions/requests/loadComputersForRequests';
import loadEntitiesForRequests from '@/actions/requests/loadEntitiesForRequests';
import loadClientsForRequests from '@/actions/requests/loadClientsForRequests';
import { RequestFormDialog } from '@/app/pages/requests/components/request-form-dialog';
import { RequestHistoryDialog } from '@/app/pages/requests/components/request-history-dialog';
import { RequestRecord, RequestFormValues, LookupOption, SoftwareAvailabilityOption } from '@/app/pages/requests/types';


function statusPillClass(status: string): string {
  switch (status) {
    case 'Approved':
      return 'nova-pill-success';
    case 'Rejected':
      return 'nova-pill-danger';
    case 'Cancelled':
      return 'nova-pill-neutral';
    default:
      return 'nova-pill-pending';
  }
}

function targetLabel(record: RequestRecord): string {
  switch (record.allocation_type) {
    case 'User':
      return record.target_user_name ?? '—';
    case 'Computer':
      return record.asset_name ?? '—';
    case 'Entity':
      return record.entity_name ?? '—';
    case 'Client':
      return record.client_name ?? '—';
    default:
      return '—';
  }
}

export default function MyRequestsPage() {
  const { user: authenticatedUser } = useAuth();
  const actorName = authenticatedUser?.fullName ?? 'System';
  const actorUserId = authenticatedUser?.userId;
  const [formOpen, setFormOpen] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<RequestRecord | null>(null);

  const params = useMemo(() => ({ requesterId: actorUserId ?? null, statusFilter: null }), [actorUserId]);
  const [requests, loading, , refetchRequests]: [RequestRecord[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(loadRequests, [], params);

  const [softwareOptions]: [SoftwareAvailabilityOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadSoftwareForRequests,
    [],
    {},
  );
  const [departments]: [LookupOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadDepartmentsForRequests,
    [],
    {},
  );
  const [users]: [LookupOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadUsersForRequests,
    [],
    {},
  );
  const [computers]: [LookupOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadComputersForRequests,
    [],
    {},
  );
  const [entities]: [LookupOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadEntitiesForRequests,
    [],
    {},
  );
  const [clients]: [LookupOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadClientsForRequests,
    [],
    {},
  );

  const [saveRequest, saving] = useMutateAction(createRequest);
  const [cancelRequestAction, cancelling] = useMutateAction(cancelRequest);
  const [notifyApproversAction] = useMutateAction(notifyApprovers);

  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

  const handleSubmit = async (values: RequestFormValues) => {
    if (!actorUserId) return;
    const software = softwareOptions.find((s) => String(s.license_inventory_id) === values.licenseInventoryId);
    const isHardwareRequest = ['Hardware Allocation', 'Hardware Transfer', 'Return Hardware'].includes(values.requestType);
    await saveRequest({
      requestType: values.requestType,
      departmentId: values.departmentId || null,
      softwareId: null,
      licenseInventoryId: isHardwareRequest ? null : values.licenseInventoryId || null,
      allocationType: values.allocationType,
      assetId: values.allocationType === 'Computer' || isHardwareRequest ? values.assetId : null,
      entityId: values.allocationType === 'Entity' ? values.entityId : null,
      clientId: values.allocationType === 'Client' ? values.clientId : null,
      targetUserId: values.allocationType === 'User' ? values.targetUserId : null,
      justification: values.justification,
      requestedDate: values.requestedDate,
      durationDays: values.durationDays ? Number(values.durationDays) : null,
      priority: values.priority,
      requiredFromDate: values.requiredFromDate || null,
      requiredUntilDate: values.requiredUntilDate || null,
      actorName,
      actorUserId,
    });
    await notifyApproversAction({
      notificationType: 'Request Submitted',
      title: `New ${values.requestType} request`,
      message: `${actorName} submitted a ${values.requestType} request${software ? ` for ${software.software_name}` : ''} awaiting your review.`,
      actorName,
    });
    setFormOpen(false);
    await refetchRequests();
  };

  const handleCancel = async (record: RequestRecord) => {
    if (!actorUserId) return;
    await cancelRequestAction({ requestId: record.id, actorName, actorUserId });
    await refetchRequests();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">My Requests</h1>
          <p className="nova-cmdbar-desc">Submit and track license or reallocation requests.</p>
        </div>

        <div className="nova-cmdbar-actions">
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Pending" value={pendingCount} icon={FileText} tone={pendingCount > 0 ? 'warning' : 'default'} />
        <KpiCard title="Approved" value={approvedCount} icon={FileText} />
        <KpiCard title="Rejected" value={rejectedCount} icon={FileText} tone={rejectedCount > 0 ? 'danger' : 'default'} />
      </div>

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div>
            <div className="text-sm font-semibold text-foreground">Request History</div>
            <p className="mt-0.5 text-xs text-muted-foreground">All requests you have submitted.</p>
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {requests.length} request{requests.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Software</th>
                <th>For</th>
                <th>Requested</th>
                <th>Status</th>
                <th className="nova-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Loading requests…
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    You have not submitted any requests yet.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.request_type}</td>
                    <td className="nova-cell-sub">{r.software_name ?? '—'}</td>
                    <td className="nova-cell-sub">{targetLabel(r)}</td>
                    <td className="nova-cell-faint">{r.requested_date}</td>
                    <td>
                      <span className={`nova-pill ${statusPillClass(r.status)}`}>
                        <span className="nova-dot" />
                        {r.status}
                      </span>
                    </td>
                    <td className="nova-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => setHistoryRecord(r)}>
                        <History className="mr-1 h-3.5 w-3.5" /> History
                      </Button>
                      {r.status === 'Pending' ? (
                        <Button variant="ghost" size="sm" disabled={cancelling} onClick={() => handleCancel(r)}>
                          <Ban className="mr-1 h-3.5 w-3.5" /> Cancel
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RequestFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        saving={saving}
        softwareOptions={softwareOptions}
        departments={departments}
        users={users}
        computers={computers}
        entities={entities}
        clients={clients}
        onSubmit={handleSubmit}
      />
      <RequestHistoryDialog open={Boolean(historyRecord)} onOpenChange={(o) => !o && setHistoryRecord(null)} record={historyRecord} />
    </div>
  );
}
