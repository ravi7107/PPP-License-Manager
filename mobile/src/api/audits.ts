import { apiClient } from './client';
import {
  AssetAuditDetailResponse,
  AssetAuditResponse,
  AssetAuditScanResponse,
  CompleteAssetAuditRequest,
  RecordAssetAuditScanRequest,
  StartAssetAuditRequest,
} from '@/types/api';

// backend/PPS.LicenseManager.API/Controllers/AssetAuditController.cs -
// the one genuinely new backend surface this app needed (see
// mobile/README.md's "Backend changes" section for why: nothing like
// a physical audit/stocktake session existed before).

export async function getRecentAudits(
  status?: string,
  take = 20
): Promise<AssetAuditResponse[]> {
  const response = await apiClient.get<AssetAuditResponse[]>('/AssetAudit', {
    params: { status, take },
  });
  return response.data;
}

export async function getAudit(id: number): Promise<AssetAuditDetailResponse> {
  const response = await apiClient.get<AssetAuditDetailResponse>(
    `/AssetAudit/${id}`
  );
  return response.data;
}

export async function startAudit(
  request: StartAssetAuditRequest
): Promise<AssetAuditDetailResponse> {
  const response = await apiClient.post<AssetAuditDetailResponse>(
    '/AssetAudit/start',
    request
  );
  return response.data;
}

export async function recordAuditScan(
  auditId: number,
  request: RecordAssetAuditScanRequest
): Promise<AssetAuditScanResponse> {
  const response = await apiClient.post<AssetAuditScanResponse>(
    `/AssetAudit/${auditId}/scan`,
    request
  );
  return response.data;
}

export async function completeAudit(
  auditId: number,
  request: CompleteAssetAuditRequest
): Promise<AssetAuditDetailResponse> {
  const response = await apiClient.post<AssetAuditDetailResponse>(
    `/AssetAudit/${auditId}/complete`,
    request
  );
  return response.data;
}
