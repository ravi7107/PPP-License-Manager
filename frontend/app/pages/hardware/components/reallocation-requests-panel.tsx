import { useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AssetReallocationRequest,
  getMyReallocationRequests,
  getPendingReallocationRequests,
  decideReallocationRequest,
  cancelReallocationRequest,
} from '@/lib/api/asset-reallocation-requests.api';

function decisionVariant(
  decision: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (decision) {
    case 'Approved':
      return 'default';
    case 'Rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Approved':
      return 'default';
    case 'Rejected':
    case 'Cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function seatSummary(r: AssetReallocationRequest): string {
  if (!r.proposedSeatId) return 'No seat';
  return [r.proposedOfficeLocationName, r.proposedFloorName, r.proposedSeatCode]
    .filter(Boolean)
    .join(' / ');
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  Reassign: 'Reallocate',
  Reseat: 'Move seat',
  RemoteMode: 'Set Remote/WFH',
  ReturnToOffice: 'Return to office',
};

function actionSummary(r: AssetReallocationRequest): string {
  switch (r.requestType) {
    case 'Reassign':
      return r.proposedUserName ?? '—';
    case 'Reseat':
      return 'Same user';
    case 'RemoteMode':
      return 'Remote / WFH';
    case 'ReturnToOffice':
      return 'Back to office';
    default:
      return r.proposedUserName ?? '—';
  }
}

interface ReallocationRequestsPanelProps {
  mode: 'mine' | 'pending';
  isSuperAdmin?: boolean;
  isITAdmin?: boolean;
  // Bump this from the parent (e.g. after submitting a new request) to
  // force this panel to reload.
  refreshToken?: number;
}

export function ReallocationRequestsPanel({
  mode,
  isSuperAdmin,
  isITAdmin,
  refreshToken,
}: ReallocationRequestsPanelProps) {
  const [requests, setRequests] = useState<AssetReallocationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [decidingRecord, setDecidingRecord] =
    useState<AssetReallocationRequest | null>(null);
  const [decidingApprove, setDecidingApprove] = useState(true);
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        mode === 'mine'
          ? await getMyReallocationRequests()
          : await getPendingReallocationRequests();

      setRequests(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to load reallocation requests.',
      );
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, refreshToken]);

  const openDecision = (record: AssetReallocationRequest, approve: boolean) => {
    setDecidingRecord(record);
    setDecidingApprove(approve);
    setDecisionRemarks('');
    setDecisionError(null);
  };

  const confirmDecision = async () => {
    if (!decidingRecord) return;

    setDeciding(true);
    setDecisionError(null);

    try {
      await decideReallocationRequest(decidingRecord.id, {
        approve: decidingApprove,
        remarks: decisionRemarks || null,
      });

      setDecidingRecord(null);
      await load();
    } catch (err: any) {
      setDecisionError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to record your decision. Please try again.',
      );
    } finally {
      setDeciding(false);
    }
  };

  const handleCancel = async (id: number) => {
    setCancellingId(id);

    try {
      await cancelReallocationRequest(id);
      await load();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to cancel this request.',
      );
    } finally {
      setCancellingId(null);
    }
  };

  const title =
    mode === 'mine' ? 'My Reallocation Requests' : 'Pending Reallocation Requests';

  const description =
    mode === 'mine'
      ? 'Hardware reallocations you requested, awaiting Super Admin and IT Admin approval.'
      : 'Team Lead requests to reallocate hardware. Both a Super Admin and an IT Admin must approve before it takes effect.';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              {mode === 'pending' && <TableHead>Current User</TableHead>}
              <TableHead>Action</TableHead>
              <TableHead>Seat</TableHead>
              {mode === 'pending' && <TableHead>Requested By</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>IT Admin</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={mode === 'pending' ? 8 : 6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Loading requests…
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={mode === 'pending' ? 8 : 6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {mode === 'mine'
                    ? 'You haven’t requested any reallocations.'
                    : 'No pending reallocation requests.'}
                </TableCell>
              </TableRow>
            ) : (
              requests.map((r) => {
                const canDecideAsAdmin =
                  mode === 'pending' && isSuperAdmin && r.adminDecision === 'Pending';

                const canDecideAsIt =
                  mode === 'pending' && isITAdmin && r.itDecision === 'Pending';

                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.assetTag}
                      <div className="text-xs text-muted-foreground">
                        {r.hostName ?? r.assetName}
                      </div>
                    </TableCell>

                    {mode === 'pending' && (
                      <TableCell>{r.currentUserName ?? '—'}</TableCell>
                    )}

                    <TableCell>
                      <div>{actionSummary(r)}</div>
                      <div className="text-xs text-muted-foreground">
                        {REQUEST_TYPE_LABELS[r.requestType] ?? r.requestType}
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {seatSummary(r)}
                    </TableCell>

                    {mode === 'pending' && (
                      <TableCell>{r.requestedByUserName}</TableCell>
                    )}

                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={decisionVariant(r.adminDecision)}>
                        {r.adminDecision}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={decisionVariant(r.itDecision)}>
                        {r.itDecision}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {mode === 'mine' && r.status === 'Pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={cancellingId === r.id}
                          onClick={() => handleCancel(r.id)}
                        >
                          {cancellingId === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'Cancel'
                          )}
                        </Button>
                      )}

                      {mode === 'pending' && (canDecideAsAdmin || canDecideAsIt) && (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDecision(r, false)}
                          >
                            <X className="mr-1 h-3.5 w-3.5" /> Reject
                          </Button>
                          <Button size="sm" onClick={() => openDecision(r, true)}>
                            <Check className="mr-1 h-3.5 w-3.5" /> Approve
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog
        open={Boolean(decidingRecord)}
        onOpenChange={(o) => {
          if (!o) setDecidingRecord(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decidingApprove ? 'Approve' : 'Reject'} Reallocation Request
            </DialogTitle>
            <DialogDescription>
              {decidingRecord &&
                `${decidingRecord.assetTag} — ${
                  REQUEST_TYPE_LABELS[decidingRecord.requestType] ?? decidingRecord.requestType
                }: ${actionSummary(decidingRecord)}`}
            </DialogDescription>
          </DialogHeader>

          {decisionError && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {decisionError}
            </div>
          )}

          <Textarea
            placeholder="Remarks (optional)…"
            value={decisionRemarks}
            onChange={(e) => setDecisionRemarks(e.target.value)}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDecidingRecord(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={decidingApprove ? 'default' : 'destructive'}
              disabled={deciding}
              onClick={confirmDecision}
            >
              {deciding
                ? 'Saving…'
                : decidingApprove
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
