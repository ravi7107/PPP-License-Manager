import { action } from '@/lib/uibakery';

// Team Leader submits a request (license or hardware allocation/transfer/return) for review by IT Administrators.
function createRequest() {
  return action('createRequest', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO requests (
        request_type, requester_id, requester_name, department_id, software_id, license_inventory_id,
        allocation_type, asset_id, entity_id, client_id, target_user_id, justification,
        requested_date, duration_days, priority, required_from_date, required_until_date, status, created_by, updated_by
      )
      SELECT
        {{params.requestType}},
        u.id,
        {{params.actorName}},
        {{params.departmentId}}::bigint,
        {{params.softwareId}}::bigint,
        {{params.licenseInventoryId}}::bigint,
        {{params.allocationType}},
        {{params.assetId}}::bigint,
        {{params.entityId}}::bigint,
        {{params.clientId}}::bigint,
        {{params.targetUserId}}::bigint,
        {{params.justification}},
        COALESCE({{params.requestedDate}}::date, CURRENT_DATE),
        {{params.durationDays}}::integer,
        COALESCE({{params.priority}}, 'Medium'),
        {{params.requiredFromDate}}::date,
        {{params.requiredUntilDate}}::date,
        'Pending',
        {{params.actorName}},
        {{params.actorName}}
      FROM (SELECT 1) x
      LEFT JOIN users u ON LOWER(u.full_name) = LOWER({{params.actorName}}) AND u.deleted_at IS NULL
      RETURNING id;
    `,
  });
}

export default createRequest;
