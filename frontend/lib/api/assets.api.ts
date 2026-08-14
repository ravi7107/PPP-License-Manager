import api from "./client";

export type AssetStatus =
  | "Available"
  | "Assigned"
  | "Maintenance"
  | "Reserved"
  | "Retired";

export type AssetType =
  | "Desktop"
  | "Laptop"
  | "Workstation"
  | "Server";

export interface Asset {
  id: number;
  assetTag: string;
  assetName: string;
  assetType: AssetType;

  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;

  hostName: string | null;

  processor: string | null;
  ramGb: number | null;
  storageGb: number | null;
  graphicsCard: string | null;
  operatingSystem: string | null;

  departmentId?: number;
  departmentName: string;

  purchaseDate: string | null;
  warrantyExpiry: string | null;

  remarks: string | null;

  status: AssetStatus;

  isReadyForAssignment: boolean;

  isActive: boolean;
}

export interface CreateAssetRequest {
  assetTag: string;
  assetName: string;
  assetType: AssetType;

  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;

  hostName?: string | null;

  processor?: string | null;
  ramGb?: number | null;
  storageGb?: number | null;
  graphicsCard?: string | null;
  operatingSystem?: string | null;

  departmentId: number;

  purchaseDate?: string | null;
  warrantyExpiry?: string | null;

  remarks?: string | null;
}

export interface UpdateAssetRequest
  extends CreateAssetRequest {
  status: AssetStatus;

  isReadyForAssignment: boolean;

  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

export async function getAssets(): Promise<Asset[]> {
  // GET /Asset (AssetController.GetAll) returns the asset list directly -
  // Ok(assets) - not wrapped in the { success, message, data } envelope
  // used elsewhere. Confirmed against actions/assets/loadAssets.ts, which
  // the Hardware Assets page uses and reads response.data the same way.
  // The old response.data.data here silently resolved to undefined
  // (axios never throws for this), so every caller of getAssets() -
  // Dashboard and Allocations - was always getting an empty asset list.
  const response = await api.get<Asset[]>("/Asset");

  return response.data;
}

export async function getAsset(
  id: number
): Promise<Asset> {
  const response =
    await api.get<ApiResponse<Asset>>(
      `/Asset/${id}`
    );

  return response.data.data;
}

export async function createAsset(
  request: CreateAssetRequest
): Promise<Asset> {
  const response =
    await api.post<ApiResponse<Asset>>(
      "/Asset",
      request
    );

  return response.data.data;
}

export async function updateAsset(
  id: number,
  request: UpdateAssetRequest
): Promise<Asset> {
  const response =
    await api.put<ApiResponse<Asset>>(
      `/Asset/${id}`,
      request
    );

  return response.data.data;
}

export async function deleteAsset(
  id: number
): Promise<void> {
  await api.delete(`/Asset/${id}`);
}
