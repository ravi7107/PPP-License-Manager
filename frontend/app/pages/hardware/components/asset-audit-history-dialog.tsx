import { useMemo } from 'react';
import { useLoadAction } from '@/lib/uibakery';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { loadAssetAuditHistory } from '@/actions/assets/auditLog';
import { AssetRecord } from '@/app/pages/hardware/types';

interface AuditEntry {
  id: number;
  action: string;
  changed_at: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_by: string | null;
}

interface AssetAuditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetRecord | null;
}

function actionVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (action) {
    case 'INSERT':
      return 'default';
    case 'UPDATE':
      return 'secondary';
    case 'DELETE':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function AssetAuditHistoryDialog({ open, onOpenChange, asset }: AssetAuditHistoryDialogProps) {
  const params = useMemo(() => ({ recordId: asset?.id }), [asset?.id]);
  const [entries, loading]: [AuditEntry[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadAssetAuditHistory,
    [],
    params,
    { enabled: open && Boolean(asset?.id) },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Audit History</DialogTitle>
          <DialogDescription>{asset ? `Change history for ${asset.asset_tag}` : ''}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading history…</p>
          ) : !Array.isArray(entries) || entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No audit records for this asset yet.</p>
          ) : (
            <div className="space-y-3">
              {(Array.isArray(entries) ? entries : []).map((entry) => (
                <div key={entry.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={actionVariant(entry.action)}>{entry.action}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.changed_at?.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">By {entry.created_by ?? 'Unknown'}</p>
                  {entry.new_values ? (
                    <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {JSON.stringify(entry.new_values, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
