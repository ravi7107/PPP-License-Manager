import { useEffect, useMemo, useState } from 'react';
import { History, User, Monitor, CalendarDays } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import {
  ResourceAllocation,
  getResourceAllocationHistory,
} from '@/lib/api/resource-allocations.api';

interface ResourceAllocationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: ResourceAllocation | null;
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status.toLowerCase()) {
    case 'allocated':
      return 'default';

    case 'transferred':
      return 'secondary';

    case 'released':
      return 'outline';

    default:
      return 'outline';
  }
}

export function ResourceAllocationHistoryDialog({
  open,
  onOpenChange,
  allocation,
}: ResourceAllocationHistoryDialogProps) {
  const [history, setHistory] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !allocation?.licenseId) {
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getResourceAllocationHistory(
          allocation.licenseId
        );

        if (!cancelled) {
          setHistory(
            Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          setHistory([]);

          setError(
            err?.response?.data?.message ||
              err?.response?.data?.title ||
              err?.message ||
              'Unable to load allocation history.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [open, allocation?.licenseId]);

  const currentAllocation = useMemo(() => {
    return history.find((item) => item.isActive) ?? null;
  }, [history]);

  const closeDialog = (value: boolean) => {
    onOpenChange(value);

    if (!value) {
      setHistory([]);
      setError('');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={closeDialog}
    >
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            License Allocation History
          </DialogTitle>

          <DialogDescription>
            {allocation
              ? `${allocation.licenseAliasCode} — ${allocation.softwareName}`
              : 'Complete license allocation lifecycle'}
          </DialogDescription>
        </DialogHeader>

        {allocation ? (
          <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">
                License
              </p>

              <p className="font-medium">
                {allocation.licenseAliasCode}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Software
              </p>

              <p className="font-medium">
                {allocation.softwareName}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Current Status
              </p>

              <div className="mt-1">
                <Badge
                  variant={statusVariant(
                    currentAllocation?.status ??
                      allocation.status
                  )}
                >
                  {currentAllocation?.status ??
                    allocation.status}
                </Badge>
              </div>
            </div>

            {currentAllocation ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Currently Allocated To
                  </p>

                  <p className="font-medium">
                    {currentAllocation.userName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Asset
                  </p>

                  <p className="font-medium">
                    {currentAllocation.assetName || 'No Asset'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Expected Return
                  </p>

                  <p className="font-medium">
                    {formatDate(
                      currentAllocation.expectedReturnDate
                    )}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <Separator />

        <ScrollArea className="max-h-[52vh] pr-4">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading allocation history...
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No allocation history found.
            </div>
          ) : (
            <div className="space-y-0">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="relative flex gap-4 pb-6"
                >
                  <div className="flex w-6 flex-col items-center">
                    <div className="mt-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />

                    {index < history.length - 1 ? (
                      <div className="mt-1 w-px flex-1 bg-border" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={statusVariant(
                              entry.status
                            )}
                          >
                            {entry.status}
                          </Badge>

                          {entry.isActive ? (
                            <span className="text-xs font-medium text-primary">
                              Current
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 font-medium">
                          {entry.userName}
                        </p>
                      </div>

                      <span className="text-xs text-muted-foreground">
                        {formatDate(entry.allocatedOn)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div className="flex gap-2">
                        <User className="mt-0.5 h-4 w-4 text-muted-foreground" />

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Allocated To
                          </p>

                          <p>{entry.userName}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Monitor className="mt-0.5 h-4 w-4 text-muted-foreground" />

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Asset
                          </p>

                          <p>
                            {entry.assetName || 'No Asset'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Allocated On
                          </p>

                          <p>
                            {formatDate(entry.allocatedOn)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Expected Return
                        </p>

                        <p>
                          {formatDate(
                            entry.expectedReturnDate
                          )}
                        </p>
                      </div>

                      {entry.actualReturnDate ? (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {entry.status === 'Transferred'
                              ? 'Transferred On'
                              : 'Returned On'}
                          </p>

                          <p>
                            {formatDate(
                              entry.actualReturnDate
                            )}
                          </p>
                        </div>
                      ) : null}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Performed By
                        </p>

                        <p>
                          {entry.allocatedBy ||
                            'Unknown'}
                        </p>
                      </div>
                    </div>

                    {entry.remarks ? (
                      <div className="mt-4 rounded-md bg-muted/50 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Remarks
                        </p>

                        <p className="mt-1 text-sm">
                          {entry.remarks}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
