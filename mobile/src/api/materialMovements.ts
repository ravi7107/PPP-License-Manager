import { apiClient, unwrap } from './client';
import {
  MaterialMovementResponse,
  ReceiveMaterialMovementRequest,
} from '@/types/api';

/**
 * Extension 4, Phase 21 - wraps MaterialMovementController's "MOBILE:
 * GATE PASS LOOKUP / TRANSFER / RECEIVE (Phase 5)" endpoints exactly as
 * they already exist server-side (built in an earlier phase of this
 * engagement, never previously called from this app). All three are
 * wrapped in the standard ApiResponse<T> envelope (the controller uses
 * Success(...) on every one of them), so every call here goes through
 * unwrap() - same pattern as assets.ts's getAssetByCode/createAsset.
 */

// GET /MaterialMovement/by-gate-pass/{gatePassNumber} - exact match,
// no fuzzy search. 404 (surfaced as a thrown ApiError by the response
// interceptor) means "no movement found for that gate pass" - handled
// by the caller (see app/(app)/gate-pass/scan.tsx).
export async function getByGatePassNumber(
  gatePassNumber: string
): Promise<MaterialMovementResponse> {
  const response = await apiClient.get(
    `/MaterialMovement/by-gate-pass/${encodeURIComponent(gatePassNumber)}`
  );
  return unwrap<MaterialMovementResponse>(response.data);
}

// POST /MaterialMovement/{id}/transfer - Facility's "Confirm Transfer
// (Outward)" tap. No request body. Requires Status == 'AwaitingTransfer'
// server-side; anything else comes back as a 400 with a real message.
export async function transferMovement(
  id: number
): Promise<MaterialMovementResponse> {
  const response = await apiClient.post(`/MaterialMovement/${id}/transfer`);
  return unwrap<MaterialMovementResponse>(response.data);
}

// POST /MaterialMovement/{id}/receive - Facility's "Confirm Receipt
// (Inward)" tap. Request body is optional server-side (a plain "scan
// and tap Receive" with no discrepancy notes is a fully valid call) -
// mirrored here by making the parameter optional too, defaulting to an
// empty object rather than omitting the body, since axios would
// otherwise send no body at all for a bare POST, which the backend
// already treats identically (ReceiveMaterialMovementRequest? is
// nullable there too).
export async function receiveMovement(
  id: number,
  request: ReceiveMaterialMovementRequest = {}
): Promise<MaterialMovementResponse> {
  const response = await apiClient.post(
    `/MaterialMovement/${id}/receive`,
    request
  );
  return unwrap<MaterialMovementResponse>(response.data);
}
