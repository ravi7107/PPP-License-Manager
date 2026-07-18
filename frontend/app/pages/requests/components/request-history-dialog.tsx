import { useMemo } from 'react';
import { useLoadAction } from '@/lib/uibakery';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import loadApprovalHistory from '@/actions/requests/loadApprovalHistory';
import { RequestRecord, ApprovalRecord } from '@/app/pages/requests/types';

interface RequestHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: RequestRecord | null;
}

function decisionVariant(decision: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (decision) {
    case 'Approved':
      return 'default';
    case 'Rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function RequestHistoryDialog({ open, onOpenChange, record }: RequestHistoryDialogProps) {
  const params = useMemo(() => ({ requestId: record?.id }), [record?.id]);
  const [entries, loading]: [ApprovalRecord[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadApprovalHistory,
    [],
    params,
    { enabled: open && Boolean(record?.id) },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Approval History</DialogTitle>
          <DialogDescription>
            {record ? `Decisions recorded for this ${record.request_type} request` : ''}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading history…</p>
          ) : entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No decisions recorded yet — still pending.</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={decisionVariant(entry.decision)}>{entry.decision}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.decided_at?.slice(0, 19).replace('T', ' ') ?? entry.created_at?.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">By {entry.approver_name ?? 'Unknown'}</p>
                  {entry.comment ? <p className="mt-2 text-sm">{entry.comment}</p> : null}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
