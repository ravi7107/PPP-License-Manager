import { createApiRequest } from '@/lib/api/requests.api';

interface CreateRequestParams {
  requestType: string;
  departmentId: string | null;
  softwareId: string | null;
  licenseInventoryId: string | null;
  allocationType: string;
  assetId: string | null;
  entityId: string | null;
  clientId: string | null;
  targetUserId: string | null;
  justification: string;
  requestedDate: string;
  durationDays: number | null;
  priority: string;
  requiredFromDate: string | null;
  requiredUntilDate: string | null;
  actorName: string;
  actorUserId: number;
}

function toIntOrNull(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

// Team Leader/employee submits a request (license or hardware
// allocation/transfer/return) for review by IT Administrators. Real REST
// call - see actions/requests/loadRequests.ts for context on why this
// used to be a no-op.
async function createRequest(params: CreateRequestParams) {
  return createApiRequest({
    requestType: params.requestType,
    requesterId: params.actorUserId,
    departmentId: toIntOrNull(params.departmentId),
    // licenseInventoryId carries the selected Software's id (the request
    // form's "software license pool" concept doesn't exist in this app's
    // License model, which tracks individual seats, not pools - see the
    // comment on Models/Request.cs).
    softwareId: toIntOrNull(params.licenseInventoryId) ?? toIntOrNull(params.softwareId),
    allocationType: params.allocationType,
    assetId: toIntOrNull(params.assetId),
    companyId: toIntOrNull(params.entityId),
    clientId: toIntOrNull(params.clientId),
    targetUserId: toIntOrNull(params.targetUserId),
    justification: params.justification,
    requestedDate: params.requestedDate || null,
    durationDays: params.durationDays,
    priority: params.priority,
    requiredFromDate: params.requiredFromDate,
    requiredUntilDate: params.requiredUntilDate,
  });
}

export default createRequest;
