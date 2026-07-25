import api from "./client";

export interface AllocationRequest {
  id: number;
  requestReference: string;

  softwareId: number;
  softwareName: string;

  requestedByUserId: number;
  requestedByUserName: string;

  assetId: number | null;
  assetName: string | null;

  businessJustification: string;

  requiredFrom: string;
  requiredTill: string | null;

  priority: string;
  status: string;

  remarks: string | null;
  createdAt: string;
}

export async function getAllocationRequests(): Promise<AllocationRequest[]> {
  const response = await api.get<AllocationRequest[]>(
    "/AllocationRequest"
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
}

export async function getAllocationRequest(
  id: number
): Promise<AllocationRequest> {
  const response = await api.get<AllocationRequest>(
    `/AllocationRequest/${id}`
  );

  return response.data;
}

export async function approveAllocationRequest(
  id: number,
  approvedByUserId: number
): Promise<AllocationRequest> {
  const response = await api.post<AllocationRequest>(
    `/AllocationRequest/${id}/approve`,
    {
      approvedByUserId,
    }
  );

  return response.data;
}

export async function rejectAllocationRequest(
  id: number,
  approvedByUserId: number,
  reason: string
): Promise<AllocationRequest> {
  const response = await api.post<AllocationRequest>(
    `/AllocationRequest/${id}/reject`,
    {
      approvedByUserId,
      reason,
    }
  );

  return response.data;
}
