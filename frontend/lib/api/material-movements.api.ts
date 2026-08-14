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

export interface MaterialMovement {
  id: number;
  movementNumber: string | null;
  movementType: string;
  status: string;

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
