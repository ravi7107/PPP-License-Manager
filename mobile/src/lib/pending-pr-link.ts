import { PurchaseRequisitionAvailableLineResponse } from '@/types/api';

/**
 * A tiny in-memory handoff for the "scan a PR QR from within Add Asset"
 * sub-flow (Extension 4, Phase 22). Expo Router has no built-in way for
 * a pushed screen to return a value to the screen that pushed it, and
 * routing back via URL params + router.replace would remount Add Asset
 * from scratch - losing whatever the user had already typed (Asset Tag,
 * Name, ...). router.back() instead returns to the exact existing form
 * instance, which reads this once (see asset/new.tsx's useFocusEffect)
 * and immediately clears it, so a later, unrelated navigation back to
 * Add Asset never re-applies stale data.
 */
let pending: PurchaseRequisitionAvailableLineResponse | null = null;

export function setPendingPrLink(
  line: PurchaseRequisitionAvailableLineResponse
): void {
  pending = line;
}

export function takePendingPrLink(): PurchaseRequisitionAvailableLineResponse | null {
  const value = pending;
  pending = null;
  return value;
}
