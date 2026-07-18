import { useMemo, useState } from 'react';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
import { Check, X, History, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KpiCard } from '@/components/layout/kpi-card';
import loadRequests from '@/actions/requests/loadRequests';
import approveRequest from '@/actions/requests/approveRequest';
import rejectRequest from '@/actions/requests/rejectRequest';
import notifyRequester from '@/actions/requests/notifyRequester';
import { RequestHistoryDialog } from '@/app/pages/requests/components/request-history-dialog';
import { DecisionDialog } from '@/app/pages/requests/components/decision-dialog';
import { RequestRecord } from '@/app/pages/requests/types';

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Approved':
      return 'default';
    case 'Rejected':
      return 'destructive';
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
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Approvals</h2>
        <p className="text-sm text-muted-foreground">Review and decide on pending license and reallocation requests.</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Requests</CardTitle>
          <CardDescription>Awaiting your decision.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Software</TableHead>
                <TableHead>For</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Loading requests…
                  </TableCell>
                </TableRow>
              ) : pending.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No pending requests right now.
                  </TableCell>
                </TableRow>
              ) : (
                pending.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.request_type}</TableCell>
                    <TableCell>{r.requester_name ?? '—'}</TableCell>
                    <TableCell>{r.software_name ?? '—'}</TableCell>
                    <TableCell>{targetLabel(r)}</TableCell>
                    <TableCell>{r.requested_date}</TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision History</CardTitle>
          <CardDescription>Previously decided requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Software</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests
                .filter((r) => r.status !== 'Pending')
                .map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.request_type}</TableCell>
                    <TableCell>{r.requester_name ?? '—'}</TableCell>
                    <TableCell>{r.software_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setHistoryRecord(r)}>
                        <History className="mr-1 h-3.5 w-3.5" /> History
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {requests.filter((r) => r.status !== 'Pending').length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No decisions recorded yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
