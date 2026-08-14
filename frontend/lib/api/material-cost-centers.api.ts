import api from './client';

export interface MaterialCostCenter {
  id: number;
  code: string;
  name: string;
  companyId: number | null;
  companyName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateMaterialCostCenterRequest {
  code: string;
  name: string;
  companyId?: number | null;
}

export interface UpdateMaterialCostCenterRequest
  extends CreateMaterialCostCenterRequest {
  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

export async function getMaterialCostCenters(): Promise<
  MaterialCostCenter[]
> {
  const response =
    await api.get<ApiResponse<MaterialCostCenter[]>>(
      '/MaterialCostCenter'
    );

  return response.data.data;
}

export async function getMaterialCostCenter(
  id: number
): Promise<MaterialCostCenter> {
  const response =
    await api.get<ApiResponse<MaterialCostCenter>>(
      `/MaterialCostCenter/${id}`
    );

  return response.data.data;
}

export async function createMaterialCostCenter(
  request: CreateMaterialCostCenterRequest
): Promise<MaterialCostCenter> {
  const response =
    await api.post<ApiResponse<MaterialCostCenter>>(
      '/MaterialCostCenter',
      request
    );

  return response.data.data;
}

export async function updateMaterialCostCenter(
  id: number,
  request: UpdateMaterialCostCenterRequest
): Promise<MaterialCostCenter> {
  const response =
    await api.put<ApiResponse<MaterialCostCenter>>(
      `/MaterialCostCenter/${id}`,
      request
    );

  return response.data.data;
}

export async function deleteMaterialCostCenter(
  id: number
): Promise<void> {
  await api.delete(`/MaterialCostCenter/${id}`);
}
