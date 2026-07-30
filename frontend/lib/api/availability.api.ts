import api from './client';

export interface UserUnavailabilityApi {
  id: number;
  userId: number;
  userName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdByUserId: number;
  createdBy: string;
  createdAt: string;
  cancelledAt: string | null;
  cancelledByUserId: number | null;
  cancelledBy: string | null;
}

export interface AvailableLicenseResourceApi {
  userUnavailabilityId: number;
  resourceAllocationId: number;
  licenseId: number;
  licenseAliasCode: string;
  softwareName: string;
  currentUserId: number;
  currentUserName: string;
  assetId: number | null;
  assetName: string | null;
  unavailableFrom: string;
  unavailableTill: string;
  reason: string;
  licenseExpiryDate: string;
}

export interface ResourceReallocationApi {
  id: number;
  requestReference: string;

  userUnavailabilityId: number;
  resourceAllocationId: number;

  licenseId: number;
  licenseAliasCode: string;
  softwareName: string;

  currentUserId: number;
  currentUserName: string;

  targetUserId: number;
  targetUserName: string;

  requestedByUserId: number;
  requestedBy: string;

  status: string;
  remarks: string | null;
  createdAt: string;

  decidedAt: string | null;
  decidedByUserId: number | null;
  decidedBy: string | null;
  decisionRemarks: string | null;

  resultingAllocationId: number | null;
  resultingAllocationActive: boolean | null;

  returnedAt: string | null;
  returnedByUserId: number | null;
  returnedBy: string | null;
  returnRemarks: string | null;
  returnAllocationId: number | null;
}

export interface CreateUserUnavailabilityApiRequest {
  userId: number;
  startDate: string;
  endDate: string;
  reason: string;
  createdByUserId: number;
}

export interface CancelUserUnavailabilityApiRequest {
  cancelledByUserId: number;
}

export interface CreateResourceReallocationApiRequest {
  userUnavailabilityId: number;
  resourceAllocationId: number;
  targetUserId: number;
  requestedByUserId: number;
  remarks?: string | null;
}

export interface DecideResourceReallocationApiRequest {
  decidedByUserId: number;
  approve: boolean;
  decisionRemarks?: string | null;
}

export interface ReturnResourceReallocationApiRequest {
  returnedByUserId: number;
  remarks?: string | null;
}

export async function getUnavailabilities():
  Promise<UserUnavailabilityApi[]> {
  const response = await api.get<UserUnavailabilityApi[]>(
    '/Availability/unavailabilities'
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
}

export async function createUnavailability(
  request: CreateUserUnavailabilityApiRequest
): Promise<UserUnavailabilityApi> {
  const response = await api.post<UserUnavailabilityApi>(
    '/Availability/unavailabilities',
    request
  );

  return response.data;
}

export async function cancelUnavailability(
  id: number,
  request: CancelUserUnavailabilityApiRequest
): Promise<void> {
  await api.post(
    `/Availability/unavailabilities/${id}/cancel`,
    request
  );
}

export async function getAvailableLicenseResources():
  Promise<AvailableLicenseResourceApi[]> {
  const response = await api.get<AvailableLicenseResourceApi[]>(
    '/Availability/available-licenses'
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
}

export async function getReallocationRequests():
  Promise<ResourceReallocationApi[]> {
  const response = await api.get<ResourceReallocationApi[]>(
    '/Availability/reallocation-requests'
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
}

export async function createReallocationRequest(
  request: CreateResourceReallocationApiRequest
): Promise<ResourceReallocationApi> {
  const response = await api.post<ResourceReallocationApi>(
    '/Availability/reallocation-requests',
    request
  );

  return response.data;
}

export async function decideReallocationRequest(
  id: number,
  request: DecideResourceReallocationApiRequest
): Promise<ResourceReallocationApi> {
  const response = await api.post<ResourceReallocationApi>(
    `/Availability/reallocation-requests/${id}/decision`,
    request
  );

  return response.data;
}

export async function returnReallocationToOriginalUser(
  id: number,
  request: ReturnResourceReallocationApiRequest
): Promise<ResourceReallocationApi> {
  const response = await api.post<ResourceReallocationApi>(
    `/Availability/reallocation-requests/${id}/return`,
    request
  );

  return response.data;
}
