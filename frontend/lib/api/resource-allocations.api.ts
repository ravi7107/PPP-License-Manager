import api from "./client";

export interface ResourceAllocation {
  id: number;
  allocationReference: string;

  licenseId: number;
  licenseAliasCode: string;
  softwareName: string;

  userId: number;
  userName: string;

  assetId: number | null;
  assetName: string | null;

  allocatedByUserId: number;
  allocatedBy: string;

  allocatedOn: string;
  expectedReturnDate: string | null;
  actualReturnDate: string | null;

  status: string;
  remarks: string | null;

  isActive: boolean;
  createdAt: string;
}

export interface CreateResourceAllocationRequest {
  licenseId: number;
  userId: number;
  assetId?: number | null;
  allocatedByUserId: number;
  expectedReturnDate?: string | null;
  remarks?: string | null;
}

export interface UpdateResourceAllocationRequest {
  userId: number;
  assetId?: number | null;
  expectedReturnDate?: string | null;
  actualReturnDate?: string | null;
  status: string;
  remarks?: string | null;
  isActive: boolean;
}

export interface ReleaseResourceAllocationRequest {
  remarks?: string | null;
}

export async function getResourceAllocations():
  Promise<ResourceAllocation[]> {
  const response =
    await api.get<ResourceAllocation[]>(
      "/ResourceAllocation"
    );

  return response.data;
}

// Phase 11 - active allocations tied directly to one asset, for the
// Asset detail views' "Allocated Licenses" section.
export async function getActiveResourceAllocationsByAsset(
  assetId: number
): Promise<ResourceAllocation[]> {
  const response =
    await api.get<ResourceAllocation[]>(
      `/ResourceAllocation/asset/${assetId}/active`
    );

  return response.data;
}

export async function getResourceAllocation(
  id: number
): Promise<ResourceAllocation> {
  const response =
    await api.get<ResourceAllocation>(
      `/ResourceAllocation/${id}`
    );

  return response.data;
}

export async function createResourceAllocation(
  request: CreateResourceAllocationRequest
): Promise<ResourceAllocation> {
  const response =
    await api.post<ResourceAllocation>(
      "/ResourceAllocation",
      request
    );

  return response.data;
}

export async function updateResourceAllocation(
  id: number,
  request: UpdateResourceAllocationRequest
): Promise<ResourceAllocation> {
  const response =
    await api.put<ResourceAllocation>(
      `/ResourceAllocation/${id}`,
      request
    );

  return response.data;
}

export async function releaseResourceAllocation(
  id: number,
  request: ReleaseResourceAllocationRequest
): Promise<void> {
  await api.post(
    `/ResourceAllocation/${id}/release`,
    request
  );
}

export async function deleteResourceAllocation(
  id: number
): Promise<void> {
  await api.delete(
    `/ResourceAllocation/${id}`
  );
}

export interface TransferResourceAllocationRequest {
  newUserId: number;
  newAssetId?: number | null;
  transferredByUserId: number;
  expectedReturnDate?: string | null;
  remarks?: string | null;
}

export async function transferResourceAllocation(
  id: number,
  request: TransferResourceAllocationRequest
): Promise<ResourceAllocation> {
  const response = await api.post<ResourceAllocation>(
    `/ResourceAllocation/${id}/transfer`,
    request
  );

  return response.data;
}

export async function getResourceAllocationHistory(
  licenseId: number
): Promise<ResourceAllocation[]> {
  const response = await api.get<ResourceAllocation[]>(
    `/ResourceAllocation/license/${licenseId}/history`
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
}
