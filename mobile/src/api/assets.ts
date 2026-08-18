import { apiClient, unwrap } from './client';
import {
  AssetFilterRequest,
  AssetFullDetailResponse,
  AssetResponse,
  CreateAssetRequest,
  PagedResponse,
} from '@/types/api';

// GET /Asset/by-code/{code} - the exact-match lookup added for this
// app (backend/PPS.LicenseManager.API/Controllers/AssetController.cs).
// Wrapped in ApiResponse<T>. A 404 here means "no asset matches this
// code" - handled by the caller (see app/(app)/scan.tsx), not here.
export async function getAssetByCode(
  code: string
): Promise<AssetFullDetailResponse> {
  const response = await apiClient.get(
    `/Asset/by-code/${encodeURIComponent(code)}`
  );
  return unwrap<AssetFullDetailResponse>(response.data);
}

// GET /Asset/{id}/full-detail - raw body, not wrapped.
export async function getAssetFullDetail(
  id: number
): Promise<AssetFullDetailResponse> {
  const response = await apiClient.get<AssetFullDetailResponse>(
    `/Asset/${id}/full-detail`
  );
  return response.data;
}

// GET /Asset/list?search=&departmentId=&... - the existing free-text
// search (matches AssetTag, AssetName, SerialNumber, HostName,
// Manufacturer, Model via Contains - see AssetService.GetPagedAsync).
// Used by the Search screen, never by the scanner (which needs
// getAssetByCode's exact match instead).
export async function searchAssets(
  filter: AssetFilterRequest
): Promise<PagedResponse<AssetResponse>> {
  const response = await apiClient.get('/Asset/list', { params: filter });
  return unwrap<PagedResponse<AssetResponse>>(response.data);
}

// POST /Asset - existing create action (see types/api.ts's
// CreateAssetRequest doc comment: no new backend surface here). The
// live response today is a raw AssetResponse body via CreatedAtAction,
// not wrapped in ApiResponse<T> - but unwrap() only unwraps a payload
// that actually looks like the envelope (has a `success` key), so this
// stays correct even if that endpoint's wrapping ever changes to match
// the rest of the controller, without needing another live/curl
// verification pass first (see mobile/README.md's note on this
// deployment's per-endpoint wrapping inconsistency).
export async function createAsset(
  request: CreateAssetRequest
): Promise<AssetResponse> {
  const response = await apiClient.post('/Asset', request);
  return unwrap<AssetResponse>(response.data);
}
