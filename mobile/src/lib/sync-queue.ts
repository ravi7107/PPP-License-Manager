import AsyncStorage from '@react-native-async-storage/async-storage';
import * as audits from '@/api/audits';

/**
 * Offline queue for audit scans recorded while the device has no
 * connectivity (section 17). Scope is deliberately narrow - the only
 * operation that needs to survive being offline is "I scanned this
 * code during audit session N"; nothing else in this app writes data
 * while offline (Transfer requires being online to look up
 * destinations and get a server decision - see app/(app)/asset/[id]/
 * transfer.tsx).
 *
 * PENDING -> SYNCING -> SYNCED, or -> FAILED (never silently dropped -
 * a failed item stays in the queue with its error message until the
 * user retries or the app retries automatically on reconnect).
 */

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface SyncQueueItem {
  localId: string;
  operationType: 'AUDIT_SCAN';
  auditId: number;
  // The scanned code, not a resolved database asset id - that
  // resolution only happens server-side once this syncs (see
  // backend AssetAuditService.RecordScanAsync).
  assetId: string;
  payload: { code: string };
  timestamp: string;
  retryCount: number;
  status: SyncStatus;
  errorMessage: string | null;
}

const QUEUE_KEY = 'pps_scanner_sync_queue';
let localIdCounter = 0;

function nextLocalId(): string {
  localIdCounter += 1;
  return `sync_${Date.now()}_${localIdCounter}`;
}

export async function getQueue(): Promise<SyncQueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SyncQueueItem[]) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: SyncQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueAuditScan(
  auditId: number,
  code: string
): Promise<SyncQueueItem> {
  const item: SyncQueueItem = {
    localId: nextLocalId(),
    operationType: 'AUDIT_SCAN',
    auditId,
    assetId: code,
    payload: { code },
    timestamp: new Date().toISOString(),
    retryCount: 0,
    status: 'PENDING',
    errorMessage: null,
  };

  const queue = await getQueue();
  queue.push(item);
  await saveQueue(queue);

  return item;
}

async function updateItem(
  localId: string,
  patch: Partial<SyncQueueItem>
): Promise<void> {
  const queue = await getQueue();
  const next = queue.map((item) =>
    item.localId === localId ? { ...item, ...patch } : item
  );
  await saveQueue(next);
}

export async function removeSyncedItems(): Promise<void> {
  const queue = await getQueue();
  await saveQueue(queue.filter((item) => item.status !== 'SYNCED'));
}

export interface SyncRunResult {
  synced: number;
  failed: number;
  remaining: number;
}

// Attempts every PENDING/FAILED item in order, oldest first. Does not
// throw - a single failed item just gets marked FAILED with a reason
// and the run continues with the rest, so one bad item can't block an
// entire queue of otherwise-good scans.
export async function processQueue(): Promise<SyncRunResult> {
  const queue = await getQueue();
  const toProcess = queue.filter(
    (item) => item.status === 'PENDING' || item.status === 'FAILED'
  );

  let synced = 0;
  let failed = 0;

  for (const item of toProcess) {
    await updateItem(item.localId, { status: 'SYNCING' });

    try {
      await audits.recordAuditScan(item.auditId, item.payload);
      await updateItem(item.localId, { status: 'SYNCED', errorMessage: null });
      synced += 1;
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Sync failed.';

      await updateItem(item.localId, {
        status: 'FAILED',
        retryCount: item.retryCount + 1,
        errorMessage: message,
      });
      failed += 1;
    }
  }

  const finalQueue = await getQueue();
  const remaining = finalQueue.filter(
    (item) => item.status === 'PENDING' || item.status === 'FAILED'
  ).length;

  return { synced, failed, remaining };
}
