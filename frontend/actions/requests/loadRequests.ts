import { action } from '@/lib/uibakery';

// Loads requests, optionally scoped to the current requester (My Requests) or to Pending only (Approvals queue).
function loadRequests() {
  return action('loadRequests', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        r.id,
        r.request_type,
        r.requester_name,
        d.name AS department_name,
        s.name AS software_name,
        r.license_inventory_id,
        r.allocation_type,
        r.asset_id,
        COALESCE(a.computer_name, a.asset_tag) AS asset_name,
        r.entity_id,
        e.name AS entity_name,
        r.client_id,
        c.name AS client_name,
        r.target_user_id,
        tu.full_name AS target_user_name,
        r.justification,
        r.requested_date,
        r.duration_days,
        r.status,
        r.priority,
        r.required_from_date,
        r.required_until_date,
        r.created_at,
        r.updated_at
      FROM requests r
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN software s ON s.id = r.software_id
      LEFT JOIN assets a ON a.id = r.asset_id
      LEFT JOIN entities e ON e.id = r.entity_id
      LEFT JOIN clients c ON c.id = r.client_id
      LEFT JOIN users tu ON tu.id = r.target_user_id
      WHERE r.deleted_at IS NULL
        AND ({{params.requesterName}}::text IS NULL OR LOWER(r.requester_name) = LOWER({{params.requesterName}}))
        AND ({{params.statusFilter}}::text IS NULL OR r.status = {{params.statusFilter}})
      ORDER BY r.created_at DESC;
    `,
  });
}

export default loadRequests;
