import api from './client';

// InventoryController returns plain (unwrapped) JSON on every endpoint -
// unlike Vendor/Company/Department (which wrap in {success,message,data})
// - so every function below reads response.data directly. See
// assets.api.ts's own getAssets() comment for the exact bug this
// mismatch causes when guessed wrong instead of checked against the
// controller.

export interface InventoryCategory {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface InventoryItem {
  id: number;
  inventoryTag: string;
  itemName: string;
  description: string | null;
  serialNumber: string | null;

  categoryId: number;
  categoryName: string;

  companyId: number;
  companyName: string;

  locationId: number | null;
  locationName: string | null;

  departmentId: number | null;
  departmentName: string | null;

  // Set when this item is an existing IT Asset - see the backend's own
  // InventoryItem.AssetId comment. When set, the PR/PO/cost/vendor
  // fields below are read through THAT Asset's own linked PR, not
  // through this item's own fields.
  assetId: number | null;
  assetTag: string | null;

  purchaseRequisitionId: number | null;
  purchaseRequisitionLineItemId: number | null;
  prNumber: string | null;
  poNumber: string | null;
  poDate: string | null;
  poAmount: number | null;

  purchaseCost: number | null;
  vendorId: number | null;
  vendorName: string | null;

  remarks: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface CreateInventoryItemRequest {
  inventoryTag?: string | null;
  itemName: string;
  description?: string | null;
  serialNumber?: string | null;
  categoryId: number;
  companyId: number;
  locationId?: number | null;
  departmentId?: number | null;
  assetId?: number | null;
  purchaseRequisitionLineItemId?: number | null;
  purchaseCost?: number | null;
  vendorId?: number | null;
  remarks?: string | null;
}

export interface UpdateInventoryItemRequest {
  itemName: string;
  description?: string | null;
  serialNumber?: string | null;
  categoryId: number;
  locationId?: number | null;
  departmentId?: number | null;
  assetId?: number | null;
  purchaseRequisitionLineItemId?: number | null;
  purchaseCost?: number | null;
  vendorId?: number | null;
  remarks?: string | null;
  isActive: boolean;
}

export interface GetInventoryItemsParams {
  page?: number;
  pageSize?: number;
  categoryId?: number | null;
  companyId?: number | null;
  locationId?: number | null;
  isActive?: boolean | null;
  search?: string;
}

export async function getInventoryItems(
  params: GetInventoryItemsParams = {}
): Promise<PagedResponse<InventoryItem>> {
  const response = await api.get<PagedResponse<InventoryItem>>('/Inventory', {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 25,
      categoryId: params.categoryId ?? undefined,
      companyId: params.companyId ?? undefined,
      locationId: params.locationId ?? undefined,
      isActive: params.isActive ?? undefined,
      search: params.search || undefined,
    },
  });

  return response.data;
}

export async function getInventoryItem(id: number): Promise<InventoryItem> {
  const response = await api.get<InventoryItem>(`/Inventory/${id}`);

  return response.data;
}

export async function createInventoryItem(
  request: CreateInventoryItemRequest
): Promise<InventoryItem> {
  const response = await api.post<InventoryItem>('/Inventory', request);

  return response.data;
}

export async function updateInventoryItem(
  id: number,
  request: UpdateInventoryItemRequest
): Promise<InventoryItem> {
  const response = await api.put<InventoryItem>(`/Inventory/${id}`, request);

  return response.data;
}

export async function deactivateInventoryItem(id: number): Promise<void> {
  await api.delete(`/Inventory/${id}`);
}

export async function getInventoryCategories(): Promise<
  InventoryCategory[]
> {
  const response = await api.get<InventoryCategory[]>(
    '/Inventory/categories'
  );

  return response.data;
}

export async function createInventoryCategory(request: {
  code: string;
  name: string;
  description?: string | null;
}): Promise<InventoryCategory> {
  const response = await api.post<InventoryCategory>(
    '/Inventory/categories',
    request
  );

  return response.data;
}

export async function getInventoryItemQrSvg(id: number): Promise<string> {
  const response = await api.get(`/Inventory/${id}/qr`, {
    responseType: 'text',
    transformResponse: (data) => data,
  });

  return response.data;
}

// Downloads a single printable label (QR + identity) as a PDF blob -
// same "fetch as blob, let the caller create an object URL" pattern as
// downloadAssetQrLabel in assets.api.ts.
export async function downloadInventoryItemLabelPdf(
  id: number,
  inventoryTag: string
): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get(`/Inventory/${id}/label-pdf`, {
    responseType: 'blob',
  });

  return {
    blob: response.data,
    fileName: `${inventoryTag}-label.pdf`,
  };
}

// Downloads a multi-label sheet (2 columns, as many rows as needed) for
// printing a batch of stickers right after a bulk seed - the one new
// capability this module has that Asset's own one-at-a-time label PDF
// doesn't.
export async function downloadInventoryLabelSheet(
  ids: number[]
): Promise<Blob> {
  const response = await api.post('/Inventory/label-sheet', ids, {
    responseType: 'blob',
  });

  return response.data;
}
