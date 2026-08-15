import { useMemo, useState } from 'react';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
import { Check, X, History, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/layout/kpi-card';
import loadRequests from '@/actions/requests/loadRequests';
import approveRequest from '@/actions/requests/approveRequest';
import rejectRequest from '@/actions/requests/rejectRequest';
import notifyRequester from '@/actions/requests/notifyRequester';
import { RequestHistoryDialog } from '@/app/pages/requests/components/request-history-dialog';
import { DecisionDialog } from '@/app/pages/requests/components/decision-dialog';
import { RequestRecord } from '@/app/pages/requests/types';

function statusPillClass(status: string): string {
  switch (status) {
    case 'Approved':
      return 'nova-pill-success';
    case 'Rejected':
      return 'nova-pill-danger';
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

export default function ApprovalsPage() {
  const user = useUser();
  const actorName = user?.name ?? 'System';
  const [historyRecord, setHistoryRecord] = useState<RequestRecord | null>(null);
  const [decisionRecord, setDecisionRecord] = useState<RequestRecord | null>(null);
  const [decision, setDecision] = useState<'Approved' | 'Rejected' | null>(null);
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);

  const allParams = useMemo(() => ({ requesterName: null, statusFilter: null }), []);
  const [requests, loading, , refetchRequests]: [RequestRecord[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(loadRequests, [], allParams);

  const [approve, approving] = useMutateAction(approveRequest);
  const [reject, rejecting] = useMutateAction(rejectRequest);
  const [notify] = useMutateAction(notifyRequester);

  const pending = requests.filter((r) => r.status === 'Pending');
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

  const openDecision = (record: RequestRecord, d: 'Approved' | 'Rejected') => {
    setDecisionRecord(record);
    setDecision(d);
  };

  const handleConfirm = async (comment: string) => {
    if (!decisionRecord || !decision) return;
    if (decision === 'Approved') {
      const [result] = await approve({ requestId: decisionRecord.id, comment: comment || null, actorName });
      if (result?.capacity_exceeded) {
        setCapacityWarning(
          `${decisionRecord.software_name ?? 'This license'} has no seats available. Request marked Approved but no allocation was created — release a seat first.`,
        );
      }
      await notify({
        notificationType: 'Request Approved',
        title: 'Your request was approved',
        message: `Your ${decisionRecord.request_type} request for ${decisionRecord.software_name ?? 'the requested resource'} was approved by ${actorName}.`,
        requesterName: decisionRecord.requester_name,
        actorName,
      });
    } else {
      await reject({ requestId: decisionRecord.id, comment: comment || null, actorName });
      await notify({
        notificationType: 'Request Rejected',
        title: 'Your request was rejected',
        message: `Your ${decisionRecord.request_type} request for ${decisionRecord.software_name ?? 'the requested resource'} was rejected by ${actorName}.${comment ? ` Reason: ${comment}` : ''}`,
        requesterName: decisionRecord.requester_name,
        actorName,
      });
    }
    setDecisionRecord(null);
    setDecision(null);
    await refetchRequests();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Approvals</h1>
          <p className="nova-cmdbar-desc">Review and decide on pending license and reallocation requests.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Pending Approval"
          value={pending.length}
          icon={ClipboardCheck}
          tone={pending.length > 0 ? 'warning' : 'default'}
        />
        <KpiCard title="Approved" value={approvedCount} icon={ClipboardCheck} />
        <KpiCard title="Rejected" value={rejectedCount} icon={ClipboardCheck} tone={rejectedCount > 0 ? 'danger' : 'default'} />
      </div>

      {capacityWarning ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p>{capacityWarning}</p>
        </div>
      ) : null}

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div>
            <div className="text-sm font-semibold text-foreground">Pending Requests</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Awaiting your decision.</p>
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {pending.length} pending
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Requester</th>
                <th>Software</th>
                <th>For</th>
                <th>Requested</th>
                <th className="nova-right">Decision</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Loading requests…
                  </td>
                </tr>
              ) : pending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No pending requests right now.
                  </td>
                </tr>
              ) : (
                pending.map((r) => (
                  <tr key={r.id}>
                    <td>{r.request_type}</td>
                    <td className="nova-cell-sub">{r.requester_name ?? '—'}</td>
                    <td className="nova-cell-sub">{r.software_name ?? '—'}</td>
                    <td className="nova-cell-sub">{targetLabel(r)}</td>
                    <td className="nova-cell-faint">{r.requested_date}</td>
                    <td className="nova-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setHistoryRecord(r)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openDecision(r, 'Rejected')}>
                          <X className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button size="sm" onClick={() => openDecision(r, 'Approved')}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div>
            <div className="text-sm font-semibold text-foreground">Decision History</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Previously decided requests.</p>
          </div>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Requester</th>
                <th>Software</th>
                <th>Status</th>
                <th className="nova-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests
                .filter((r) => r.status !== 'Pending')
                .map((r) => (
                  <tr key={r.id}>
                    <td>{r.request_type}</td>
                    <td className="nova-cell-sub">{r.requester_name ?? '—'}</td>
                    <td className="nova-cell-sub">{r.software_name ?? '—'}</td>
                    <td>
                      <span className={`nova-pill ${statusPillClass(r.status)}`}>
                        <span className="nova-dot" />
                        {r.status}
                      </span>
                    </td>
                    <td className="nova-right">
                      <Button variant="ghost" size="sm" onClick={() => setHistoryRecord(r)}>
                        <History className="mr-1 h-3.5 w-3.5" /> History
                      </Button>
                    </td>
                  </tr>
                ))}
              {requests.filter((r) => r.status !== 'Pending').length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No decisions recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <RequestHistoryDialog open={Boolean(historyRecord)} onOpenChange={(o) => !o && setHistoryRecord(null)} record={historyRecord} />
      <DecisionDialog
        open={Boolean(decisionRecord)}
        onOpenChange={(o) => {
          if (!o) {
            setDecisionRecord(null);
            setDecision(null);
          }
        }}
        record={decisionRecord}
        decision={decision}
        saving={approving || rejecting}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
