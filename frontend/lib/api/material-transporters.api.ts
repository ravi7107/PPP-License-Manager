import api from './client';

export interface MaterialTransporter {
  id: number;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  vehicleDetails: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateMaterialTransporterRequest {
  name: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  vehicleDetails?: string | null;
}

export interface UpdateMaterialTransporterRequest
  extends CreateMaterialTransporterRequest {
  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

export async function getMaterialTransporters(): Promise<
  MaterialTransporter[]
> {
  const response =
    await api.get<ApiResponse<MaterialTransporter[]>>(
      '/MaterialTransporter'
    );

  return response.data.data;
}

export async function getMaterialTransporter(
  id: number
): Promise<MaterialTransporter> {
  const response =
    await api.get<ApiResponse<MaterialTransporter>>(
      `/MaterialTransporter/${id}`
    );

  return response.data.data;
}

export async function createMaterialTransporter(
  request: CreateMaterialTransporterRequest
): Promise<MaterialTransporter> {
  const response =
    await api.post<ApiResponse<MaterialTransporter>>(
      '/MaterialTransporter',
      request
    );

  return response.data.data;
}

export async function updateMaterialTransporter(
  id: number,
  request: UpdateMaterialTransporterRequest
): Promise<MaterialTransporter> {
  const response =
    await api.put<ApiResponse<MaterialTransporter>>(
      `/MaterialTransporter/${id}`,
      request
    );

  return response.data.data;
}

export async function deleteMaterialTransporter(
  id: number
): Promise<void> {
  await api.delete(`/MaterialTransporter/${id}`);
}
