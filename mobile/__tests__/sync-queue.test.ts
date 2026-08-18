import * as audits from '@/api/audits';
import {
  enqueueAuditScan,
  getQueue,
  processQueue,
  removeSyncedItems,
} from '@/lib/sync-queue';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/api/audits');

const mockedRecordAuditScan = audits.recordAuditScan as jest.MockedFunction<
  typeof audits.recordAuditScan
>;

/**
 * Section 17: scans taken while offline must never be silently
 * discarded. PENDING -> SYNCING -> SYNCED, or -> FAILED with a
 * preserved error and an incremented retry count - never dropped.
 */
describe('sync queue (offline audit scans)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  it('enqueues a scan as PENDING with a retry count of zero', async () => {
    const item = await enqueueAuditScan(7, 'AST-0001');

    expect(item.status).toBe('PENDING');
    expect(item.retryCount).toBe(0);
    expect(item.auditId).toBe(7);
    expect(item.payload).toEqual({ code: 'AST-0001' });
    expect(item.errorMessage).toBeNull();

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
  });

  it('marks a successfully synced item SYNCED and does not touch other items', async () => {
    await enqueueAuditScan(7, 'AST-0001');
    await enqueueAuditScan(7, 'AST-0002');

    mockedRecordAuditScan.mockResolvedValue({
      item: {
        id: 1,
        assetId: 1,
        assetTag: 'AST-0001',
        assetName: 'Dell Laptop',
        assetType: 'Laptop',
        isExpected: true,
        isScanned: true,
        resultState: 'Found',
      } as never,
      wasDuplicate: false,
      audit: { id: 7 } as never,
    });

    const result = await processQueue();

    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.remaining).toBe(0);

    const queue = await getQueue();
    expect(queue.every((item) => item.status === 'SYNCED')).toBe(true);
  });

  it('keeps a failed item in the queue with its error and a bumped retry count - never drops it', async () => {
    await enqueueAuditScan(7, 'AST-BAD');

    mockedRecordAuditScan.mockRejectedValue({
      status: 409,
      message: 'This conflicts with the current state - please refresh and try again.',
      isNetworkError: false,
    });

    const result = await processQueue();

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(1);

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe('FAILED');
    expect(queue[0].retryCount).toBe(1);
    expect(queue[0].errorMessage).toMatch(/conflicts/i);
  });

  it('retries a previously-FAILED item on the next processQueue call', async () => {
    await enqueueAuditScan(7, 'AST-RETRY');

    mockedRecordAuditScan.mockRejectedValueOnce({
      status: 500,
      message: 'Something went wrong on the server. Please try again shortly.',
      isNetworkError: false,
    });
    await processQueue();

    mockedRecordAuditScan.mockResolvedValueOnce({
      item: { id: 2, resultState: 'Found' } as never,
      wasDuplicate: false,
      audit: { id: 7 } as never,
    });
    const secondRun = await processQueue();

    expect(secondRun.synced).toBe(1);
    expect(secondRun.remaining).toBe(0);

    const queue = await getQueue();
    expect(queue[0].status).toBe('SYNCED');
    expect(queue[0].retryCount).toBe(1); // bumped once, on the failed attempt only
  });

  it('does not re-send an item that already synced', async () => {
    await enqueueAuditScan(7, 'AST-0001');
    mockedRecordAuditScan.mockResolvedValue({
      item: { id: 1, resultState: 'Found' } as never,
      wasDuplicate: false,
      audit: { id: 7 } as never,
    });

    await processQueue();
    await processQueue();

    expect(mockedRecordAuditScan).toHaveBeenCalledTimes(1);
  });

  it('removeSyncedItems clears only SYNCED entries', async () => {
    await enqueueAuditScan(7, 'AST-OK');
    await enqueueAuditScan(7, 'AST-STUCK');

    mockedRecordAuditScan
      .mockResolvedValueOnce({
        item: { id: 1, resultState: 'Found' } as never,
        wasDuplicate: false,
        audit: { id: 7 } as never,
      })
      .mockRejectedValueOnce({
        status: 500,
        message: 'Something went wrong on the server. Please try again shortly.',
        isNetworkError: false,
      });

    await processQueue();
    await removeSyncedItems();

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe('FAILED');
  });
});
