import { getApiRequests, ApiRequestRecord } from '@/lib/api/requests.api';
import { RequestRecord } from '@/app/pages/requests/types';

function toRequestRecord(r: ApiRequestRecord): RequestRecord {
  return {
    id: r.id,
    request_type: r.requestType as RequestRecord['request_type'],
    requester_name: r.requesterName,
    department_name: r.departmentName,
    software_name: r.softwareName,
    license_inventory_id: r.softwareId,
    allocation_type: r.allocationType as RequestRecord['allocation_type'],
    asset_id: r.assetId,
    asset_name: r.assetName,
    entity_id: r.companyId,
    entity_name: r.companyName,
    client_id: r.clientId,
    client_name: r.clientName,
    target_user_id: r.targetUserId,
    target_user_name: r.targetUserName,
    justification: r.justification,
    requested_date: r.requestedDate,
    duration_days: r.durationDays,
    status: r.status as RequestRecord['status'],
    priority: r.priority as RequestRecord['priority'],
    required_from_date: r.requiredFromDate,
    required_until_date: r.requiredUntilDate,
    created_at: r.createdAt,
    updated_at: r.updatedAt ?? r.createdAt,
  };
}

// Loads requests, optionally scoped to the current requester (My Requests)
// or to a specific status. Real REST call against RequestController -
// replaces the dead lib/uibakery SQL-descriptor stub, which never
// executed and left `requests` as a non-array object (the cause of the
// "l.filter is not a function" crash on the Approvals page).
async function loadRequests(params?: { requesterId?: number | null; statusFilter?: string | null }): Promise<RequestRecord[]> {
  const rows = await getApiRequests({
    requesterId: params?.requesterId ?? null,
    status: params?.statusFilter ?? null,
  });

  return rows.map(toRequestRecord);
}

export default loadRequests;
