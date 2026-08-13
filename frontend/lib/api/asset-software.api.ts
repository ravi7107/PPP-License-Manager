import api from "./client";

// Client for the AssetSoftware join entity - "this hardware asset has this
// software/license installed on it", independent of the seat-based
// ResourceAllocation pool. This is the record that backs the "Installed
// Applications / License Copies" panel on the office floor map's asset
// detail dialog.
export interface AssetSoftware {
  id: number;
  assetId: number;
  assetTag: string;
  softwareId: number;
  softwareName: string;
  version: string;
  licenseKey: string | null;
  installDate: string;
  status: string;
  remarks: string | null;
  isActive: boolean;
}

export interface CreateAssetSoftwareRequest {
  assetId: number;
  softwareId: number;
  version: string;
  licenseKey?: string | null;
  installDate: string;
  status: string;
  remarks?: string | null;
}

export interface UpdateAssetSoftwareRequest {
  version: string;
  licenseKey?: string | null;
  installDate: string;
  status: string;
  remarks?: string | null;
  isActive: boolean;
}

export async function getAssetSoftwareByAsset(
  assetId: number
): Promise<AssetSoftware[]> {
  const response = await api.get<AssetSoftware[]>(
    `/AssetSoftware/asset/${assetId}`
  );

  return response.data;
}

export async function createAssetSoftware(
  request: CreateAssetSoftwareRequest
): Promise<AssetSoftware> {
  const response = await api.post<AssetSoftware>(
    "/AssetSoftware",
    request
  );

  return response.data;
}

export async function updateAssetSoftware(
  id: number,
  request: UpdateAssetSoftwareRequest
): Promise<AssetSoftware> {
  const response = await api.put<AssetSoftware>(
    `/AssetSoftware/${id}`,
    request
  );

  return response.data;
}

export async function deleteAssetSoftware(id: number): Promise<void> {
  await api.delete(`/AssetSoftware/${id}`);
}
