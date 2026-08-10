import api from './client';

export interface AssetReallocationRequest {
  id: number;

  assetId: number;
  assetTag: string;
  assetName: string;
  hostName: string | null;

  currentAssignmentId: number | null;
  currentUserId: number | null;
  currentUserName: string | null;

  requestedByUserId: number;
  requestedByUserName: string;

  proposedUserId: number;
  proposedUserName: string;

  proposedSeatId: number | null;
  proposedSeatCode: string | null;
  proposedSeatName: string | null;
  proposedFloorName: string | null;
  proposedOfficeLocationName: string | null;

  remarks: string | null;

  // Pending, Approved, Rejected, Cancelled
  status: string;

  // Pending, Approved, Rejected
  adminDecision: string;
  adminDecidedByUserId: number | null;
  adminDecidedByUserName: string | null;
  adminDecidedAt: string | null;
  adminRemarks: string | null;

  itDecision: string;
  itDecidedByUserId: number | null;
  itDecidedByUserName: string | null;
  itDecidedAt: string | null;
  itRemarks: string | null;

  resultingAssignmentId: number | null;

  createdAt: string;
  updatedAt: string | null;
}

export interface CreateReallocationRequest {
  assetId: number;
  proposedUserId: number;
  proposedSeatId?: number | null;
  remarks?: string | null;
}

export interface DecideReallocationRequest {
  approve: boolean;
  remarks?: string | null;
}


// ============================================================
// MY REQUESTS (Team Lead)
// ============================================================

export async function getMyReallocationRequests():
  Promise<AssetReallocationRequest[]> {
  const response =
    await api.get<AssetReallocationRequest[]>(
      '/AssetReallocationRequest/mine'
    );

  return response.data;
}


// ============================================================
// PENDING REQUESTS (Super Admin / IT Admin)
// ============================================================

export async function getPendingReallocationRequests():
  Promise<AssetReallocationRequest[]> {
  const response =
    await api.get<AssetReallocationRequest[]>(
      '/AssetReallocationRequest/pending'
    );

  return response.data;
}


// ============================================================
// CREATE
// ============================================================

export async function createReallocationRequest(
  request: CreateReallocationRequest
): Promise<AssetReallocationRequest> {
  const response =
    await api.post<AssetReallocationRequest>(
      '/AssetReallocationRequest',
      request
    );

  return response.data;
}


// ============================================================
// DECIDE (approve/reject on the caller's own side)
// ============================================================

export async function decideReallocationRequest(
  id: number,
  request: DecideReallocationRequest
): Promise<AssetReallocationRequest> {
  const response =
    await api.post<AssetReallocationRequest>(
      `/AssetReallocationRequest/${id}/decision`,
      request
    );

  return response.data;
}


// ============================================================
// CANCEL (Team Lead withdraws their own pending request)
// ============================================================

export async function cancelReallocationRequest(
  id: number
): Promise<void> {
  await api.post(`/AssetReallocationRequest/${id}/cancel`);
}
