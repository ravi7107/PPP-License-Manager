import api from './client';

export interface MaterialItem {
  id: number;
  itemCode: string;
  itemName: string;
  categoryId: number;
  categoryName: string;
  materialType: string;
  unitOfMeasure: string | null;
  isSerialized: boolean;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

// Stock, Consumable, IT Asset, Equipment, Tool, Spare Part, Other - must
// match MaterialItemService.AllowedMaterialTypes on the backend exactly.
export const MATERIAL_TYPES = [
  'Stock',
  'Consumable',
  'ITAsset',
  'Equipment',
  'Tool',
  'SparePart',
  'Other',
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];

export interface CreateMaterialItemRequest {
  itemCode: string;
  itemName: string;
  categoryId: number;
  materialType: string;
  unitOfMeasure?: string | null;
  isSerialized: boolean;
  description?: string | null;
}

export interface UpdateMaterialItemRequest
  extends CreateMaterialItemRequest {
  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

export async function getMaterialItems(): Promise<
  MaterialItem[]
> {
  const response =
    await api.get<ApiResponse<MaterialItem[]>>(
      '/MaterialItem'
    );

  return response.data.data;
}

export async function getMaterialItem(
  id: number
): Promise<MaterialItem> {
  const response =
    await api.get<ApiResponse<MaterialItem>>(
      `/MaterialItem/${id}`
    );

  return response.data.data;
}

export async function createMaterialItem(
  request: CreateMaterialItemRequest
): Promise<MaterialItem> {
  const response =
    await api.post<ApiResponse<MaterialItem>>(
      '/MaterialItem',
      request
    );

  return response.data.data;
}

export async function updateMaterialItem(
  id: number,
  request: UpdateMaterialItemRequest
): Promise<MaterialItem> {
  const response =
    await api.put<ApiResponse<MaterialItem>>(
      `/MaterialItem/${id}`,
      request
    );

  return response.data.data;
}

export async function deleteMaterialItem(
  id: number
): Promise<void> {
  await api.delete(`/MaterialItem/${id}`);
}
