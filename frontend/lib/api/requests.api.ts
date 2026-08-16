import api from './client';

// Real REST client for the Request/Approval workflow backing the
// Approvals and My Requests pages (RequestController.cs). Replaces the
// old lib/uibakery `action('...', 'SQL', {...})` descriptors, which never
// actually executed - see actions/requests/*.ts for the thin adapters
// that map these into the shapes those two pages already expect.

export interface ApiRequestRecord {
  id: number;
  requestType: string;
  requesterId: number;
  requesterName: string;
  departmentId: number | null;
  departmentName: string | null;
  softwareId: number | null;
  softwareName: string | null;
  allocationType: string;
  assetId: number | null;
  assetName: string | null;
  companyId: number | null;
  companyName: string | null;
  clientId: number | null;
  clientName: string | null;
  targetUserId: number | null;
  targetUserName: string | null;
  justification: string | null;
  requestedDate: string;
  durationDays: number | null;
  status: string;
  priority: string;
  requiredFromDate: string | null;
  requiredUntilDate: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ApiRequestApprovalRecord {
  id: number;
  requestId: number;
  approverName: string | null;
  decision: string;
  comment: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface CreateApiRequestPayload {
  requestType: string;
  requesterId: number;
  departmentId?: number | null;
  softwareId?: number | null;
  allocationType: string;
  assetId?: number | null;
  companyId?: number | null;
  clientId?: number | null;
  targetUserId?: number | null;
  justification?: string | null;
  requestedDate?: string | null;
  durationDays?: number | null;
  priority?: string;
  requiredFromDate?: string | null;
  requiredUntilDate?: string | null;
}

export async function getApiRequests(params: {
  requesterId?: number | null;
  status?: string | null;
}): Promise<ApiRequestRecord[]> {
  const response = await api.get<ApiRequestRecord[]>('/Request', {
    params: {
      requesterId: params.requesterId ?? undefined,
      status: params.status ?? undefined,
    },
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function createApiRequest(payload: CreateApiRequestPayload): Promise<ApiRequestRecord> {
  const response = await api.post<ApiRequestRecord>('/Request', payload);
  return response.data;
}

export async function cancelApiRequest(id: number, actorUserId: number): Promise<ApiRequestRecord> {
  const response = await api.put<ApiRequestRecord>(`/Request/${id}/cancel`, {
    actorUserId,
  });
  return response.data;
}

export async function approveApiRequest(
  id: number,
  actorUserId: number,
  comment: string | null,
): Promise<ApiRequestRecord> {
  const response = await api.put<ApiRequestRecord>(`/Request/${id}/approve`, {
    actorUserId,
    comment,
  });
  return response.data;
}

export async function rejectApiRequest(
  id: number,
  actorUserId: number,
  comment: string | null,
): Promise<ApiRequestRecord> {
  const response = await api.put<ApiRequestRecord>(`/Request/${id}/reject`, {
    actorUserId,
    comment,
  });
  return response.data;
}

export async function getApiRequestApprovals(requestId: number): Promise<ApiRequestApprovalRecord[]> {
  const response = await api.get<ApiRequestApprovalRecord[]>(`/Request/${requestId}/approvals`);
  return Array.isArray(response.data) ? response.data : [];
}
