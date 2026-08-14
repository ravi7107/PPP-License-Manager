import api from './client';

export interface MaterialItemCategory {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  itemCount: number;
}

export interface CreateMaterialItemCategoryRequest {
  name: string;
  code: string;
}

export interface UpdateMaterialItemCategoryRequest
  extends CreateMaterialItemCategoryRequest {
  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

export async function getMaterialItemCategories(): Promise<
  MaterialItemCategory[]
> {
  const response =
    await api.get<ApiResponse<MaterialItemCategory[]>>(
      '/MaterialItemCategory'
    );

  return response.data.data;
}

export async function getMaterialItemCategory(
  id: number
): Promise<MaterialItemCategory> {
  const response =
    await api.get<ApiResponse<MaterialItemCategory>>(
      `/MaterialItemCategory/${id}`
    );

  return response.data.data;
}

export async function createMaterialItemCategory(
  request: CreateMaterialItemCategoryRequest
): Promise<MaterialItemCategory> {
  const response =
    await api.post<ApiResponse<MaterialItemCategory>>(
      '/MaterialItemCategory',
      request
    );

  return response.data.data;
}

export async function updateMaterialItemCategory(
  id: number,
  request: UpdateMaterialItemCategoryRequest
): Promise<MaterialItemCategory> {
  const response =
    await api.put<ApiResponse<MaterialItemCategory>>(
      `/MaterialItemCategory/${id}`,
      request
    );

  return response.data.data;
}

export async function deleteMaterialItemCategory(
  id: number
): Promise<void> {
  await api.delete(`/MaterialItemCategory/${id}`);
}
