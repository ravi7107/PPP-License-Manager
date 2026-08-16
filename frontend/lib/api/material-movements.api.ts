import api from './client';

export interface MaterialMovementItem {
  id: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  materialType: string;
  assetId: number | null;
  assetTag: string | null;
  assetName: string | null;
  quantity: number;
  unitOfMeasure: string | null;
  serialNumbers: string | null;
  condition: string | null;
  remarks: string | null;
}

export interface MaterialMovementApproval {
  id: number;
  stepOrder: number;
  approverUserId: number | null;
  approverUserName: string | null;
  status: string;
  actionedAt: string | null;
  comments: string | null;
}

export interface MaterialMovementDispatch {
  id: number;
  dispatchedByUserId: number;
  dispatchedByUserName: string;
  dispatchedAt: string;
  transporterId: number | null;
  transporterName: string | null;
  vehicleNumber: string | null;
  gatePassNumber: string | null;
  hasGatePassPdf: boolean;
}

export interface MaterialMovement {
  id: number;
  movementNumber: string | null;
  movementType: string;
  status: string;
  currentApprovalStepOrder: number | null;

  fromCompanyId: number | null;
  fromCompanyName: string | null;
  fromLocationId: number | null;
  fromLocationName: string | null;
  fromDepartmentId: number | null;
  fromDepartmentName: string | null;
  fromCostCenterId: number | null;
  fromCostCenterName: string | null;

  toCompanyId: number | null;
  toCompanyName: string | null;
  toLocationId: number | null;
  toLocationName: string | null;
  toDepartmentId: number | null;
  toDepartmentName: string | null;
  toCostCenterId: number | null;
  toCostCenterName: string | null;

  vendorId: number | null;
  vendorName: string | null;

  requestedByUserId: number;
  requestedByUserName: string;
  requestedAt: string;

  expectedReturnDate: string | null;
  purpose: string | null;

  createdAt: string;
  updatedAt: string | null;

  items: MaterialMovementItem[];
  approvals: MaterialMovementApproval[];
  dispatch: MaterialMovementDispatch | null;
}

export interface MaterialMovementListItem {
  id: number;
  movementNumber: string | null;
  movementType: string;
  status: string;
  fromSummary: string | null;
  toSummary: string | null;
  requestedByUserName: string;
  itemCount: number;
  createdAt: string;
}

// InternalTransfer, InterEntityTransfer, OutwardToVendor, InwardFromVendor,
// TemporaryMovement, DirectInward, DirectOutward - must match
// MaterialApprovalWorkflowService.AllowedMovementTypes on the backend.
export const MOVEMENT_TYPES = [
  'InternalTransfer',
  'InterEntityTransfer',
  'OutwardToVendor',
  'InwardFromVendor',
  'TemporaryMovement',
  'DirectInward',
  'DirectOutward',
] as const;

export interface CreateMaterialMovementItemRequest {
  itemId: number;
  assetId?: number | null;
  quantity: number;
  unitOfMeasure?: string | null;
  serialNumbers?: string | null;
  condition?: string | null;
  remarks?: string | null;
}

export interface SaveMaterialMovementRequest {
  movementType: string;

  fromCompanyId?: number | null;
  fromLocationId?: number | null;
  fromDepartmentId?: number | null;
  fromCostCenterId?: number | null;

  toCompanyId?: number | null;
  toLocationId?: number | null;
  toDepartmentId?: number | null;
  toCostCenterId?: number | null;

  vendorId?: number | null;

  expectedReturnDate?: string | null;

  purpose?: string | null;

  items: CreateMaterialMovementItemRequest[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

export async function getMyMaterialMovements(): Promise<
  MaterialMovementListItem[]
> {
  const response =
    await api.get<ApiResponse<MaterialMovementListItem[]>>(
      '/MaterialMovement/mine'
    );

  return response.data.data;
}

export async function getAllMaterialMovements(): Promise<
  MaterialMovementListItem[]
> {
  const response =
    await api.get<ApiResponse<MaterialMovementListItem[]>>(
      '/MaterialMovement'
    );

  return response.data.data;
}

export async function getMaterialMovement(
  id: number
): Promise<MaterialMovement> {
  const response =
    await api.get<ApiResponse<MaterialMovement>>(
      `/MaterialMovement/${id}`
    );

  return response.data.data;
}

export async function createMaterialMovement(
  request: SaveMaterialMovementRequest
): Promise<MaterialMovement> {
  const response =
    await api.post<ApiResponse<MaterialMovement>>(
      '/MaterialMovement',
      request
    );

  return response.data.data;
}

export async function updateMaterialMovement(
  id: number,
  request: SaveMaterialMovementRequest
): Promise<MaterialMovement> {
  const response =
    await api.put<ApiResponse<MaterialMovement>>(
      `/MaterialMovement/${id}`,
      request
    );

  return response.data.data;
}

export async function deleteMaterialMovement(
  id: number
): Promise<void> {
  await api.delete(`/MaterialMovement/${id}`);
}

// =========================================================
// SUBMIT / APPROVE / REJECT
// =========================================================

export async function submitMaterialMovement(
  id: number
): Promise<MaterialMovement> {
  const response = await api.post<ApiResponse<MaterialMovement>>(
    `/MaterialMovement/${id}/submit`
  );

  return response.data.data;
}

export async function getPendingMyApproval(): Promise<
  MaterialMovementListItem[]
> {
  const response = await api.get<ApiResponse<MaterialMovementListItem[]>>(
    '/MaterialMovement/pending-my-approval'
  );

  return response.data.data;
}

export async function approveMaterialMovement(
  id: number,
  comments?: string | null
): Promise<MaterialMovement> {
  const response = await api.post<ApiResponse<MaterialMovement>>(
    `/MaterialMovement/${id}/approve`,
    { comments: comments ?? null }
  );

  return response.data.data;
}

export async function rejectMaterialMovement(
  id: number,
  comments?: string | null
): Promise<MaterialMovement> {
  const response = await api.post<ApiResponse<MaterialMovement>>(
    `/MaterialMovement/${id}/reject`,
    { comments: comments ?? null }
  );

  return response.data.data;
}

// =========================================================
// DISPATCH / GATE PASS
// =========================================================

export async function dispatchMaterialMovement(
  id: number,
  request: { transporterId?: number | null; vehicleNumber?: string | null }
): Promise<MaterialMovement> {
  const response = await api.post<ApiResponse<MaterialMovement>>(
    `/MaterialMovement/${id}/dispatch`,
    request
  );

  return response.data.data;
}

// Same authenticated-blob-download pattern as
// downloadPurchaseRequisitionPdf - the gate pass PDF isn't a static file
// under wwwroot, so it can't be a plain <a href>.
export async function downloadGatePassPdf(
  id: number
): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get(`/MaterialMovement/${id}/gate-pass-pdf`, {
    responseType: 'blob',
  });

  const disposition: string | undefined =
    response.headers?.['content-disposition'];
  const match = disposition?.match(/filename="?([^";]+)"?/i);

  return {
    blob: response.data,
    fileName: match?.[1] ?? `gate-pass-${id}.pdf`,
  };
}

// =========================================================
// RGP (RETURNABLE GATE PASS) TRACKING
// =========================================================

// TemporaryMovement is treated as an RGP - this covers every dispatched
// one, with ReturnStatus computed by the backend (Pending/Overdue/
// Returned), not a stored/scheduled status.
export interface RgpTrackingItem {
  id: number;
  movementNumber: string | null;
  gatePassNumber: string | null;
  fromSummary: string | null;
  toSummary: string | null;
  requestedByUserName: string;
  dispatchedAt: string;
  expectedReturnDate: string;
  actualReturnDate: string | null;
  returnStatus: 'Pending' | 'Overdue' | 'Returned';
  daysOverdue: number;
}

export interface RgpTrackingSummary {
  totalCount: number;
  pendingCount: number;
  overdueCount: number;
  returnedCount: number;
}

export interface RgpTrackingResponse {
  summary: RgpTrackingSummary;
  items: RgpTrackingItem[];
}

export async function getRgpTracking(): Promise<RgpTrackingResponse> {
  const response = await api.get<ApiResponse<RgpTrackingResponse>>(
    '/MaterialMovement/rgp-tracking'
  );

  return response.data.data;
}

export async function markReturned(
  id: number,
  remarks?: string | null
): Promise<MaterialMovement> {
  const response = await api.post<ApiResponse<MaterialMovement>>(
    `/MaterialMovement/${id}/mark-returned`,
    { remarks: remarks ?? null }
  );

  return response.data.data;
}
