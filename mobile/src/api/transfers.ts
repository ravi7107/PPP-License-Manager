import { apiClient } from './client';
import {
  AssetAssignmentResponse,
  AssignAssetRequest,
  ReturnAssetRequest,
  TransferAssetRequest,
} from '@/types/api';

/**
 * Wraps AssetAssignmentController exactly as-is - every one of these
 * calls hits the same endpoint the existing web Transfer dialog uses
 * (frontend/app/pages/hardware/components/asset-transfer-dialog.tsx).
 * No new backend logic: assign/transfer/return, permission checks,
 * seat bookkeeping, and history all stay server-side and unchanged.
 */

export async function assignAsset(
  request: AssignAssetRequest
): Promise<AssetAssignmentResponse> {
  const response = await apiClient.post<AssetAssignmentResponse>(
    '/AssetAssignment/assign',
    request
  );
  return response.data;
}

export async function transferAsset(
  assignmentId: number,
  request: TransferAssetRequest
): Promise<AssetAssignmentResponse> {
  const response = await apiClient.post<AssetAssignmentResponse>(
    `/AssetAssignment/${assignmentId}/transfer`,
    request
  );
  return response.data;
}

export async function returnAsset(
  assignmentId: number,
  request: ReturnAssetRequest
): Promise<AssetAssignmentResponse> {
  const response = await apiClient.post<AssetAssignmentResponse>(
    `/AssetAssignment/${assignmentId}/return`,
    request
  );
  return response.data;
}

// GET AssetAssignment/asset/{assetId}/history - powers Asset Details'
// "View History" action.
export async function getAssetAssignmentHistory(
  assetId: number
): Promise<AssetAssignmentResponse[]> {
  const response = await apiClient.get<AssetAssignmentResponse[]>(
    `/AssetAssignment/asset/${assetId}/history`
  );
  return response.data;
}
