import { useMemo, useState } from 'react';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
import { Plus, FileText, History, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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


function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Approved':
      return 'default';
    case 'Rejected':
      return 'destructive';
    case 'Cancelled':
      return 'outline';
    default:
      return 'secondary';
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
  const user = useUser();
  const actorName = user?.name ?? 'System';
  const [formOpen, setFormOpen] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<RequestRecord | null>(null);

  const params = useMemo(() => ({ requesterName: actorName, statusFilter: null }), [actorName]);
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
    await cancelRequestAction({ requestId: record.id, actorName });
    await refetchRequests();
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">My Requests</h2>
          <p className="text-sm text-muted-foreground">Submit and track license or reallocation requests.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Request
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Pending" value={pendingCount} icon={FileText} tone={pendingCount > 0 ? 'warning' : 'default'} />
        <KpiCard title="Approved" value={approvedCount} icon={FileText} />
        <KpiCard title="Rejected" value={rejectedCount} icon={FileText} tone={rejectedCount > 0 ? 'danger' : 'default'} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request History</CardTitle>
          <CardDescription>All requests you have submitted.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Software</TableHead>
                <TableHead>For</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Loading requests…
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    You have not submitted any requests yet.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.request_type}</TableCell>
                    <TableCell>{r.software_name ?? '—'}</TableCell>
                    <TableCell>{targetLabel(r)}</TableCell>
                    <TableCell>{r.requested_date}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => setHistoryRecord(r)}>
                        <History className="mr-1 h-3.5 w-3.5" /> History
                      </Button>
                      {r.status === 'Pending' ? (
                        <Button variant="ghost" size="sm" disabled={cancelling} onClick={() => handleCancel(r)}>
                          <Ban className="mr-1 h-3.5 w-3.5" /> Cancel
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
