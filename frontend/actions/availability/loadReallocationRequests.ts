import { action } from '@/lib/uibakery';

function loadReallocationRequests() {
  return action('loadReallocationRequests', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        rr.id,
        rr.unavailability_id,
        uup.user_id AS source_user_id,
        su.full_name AS source_user_name,
        rr.resource_type,
        rr.asset_id,
        a.asset_tag,
        rr.license_allocation_id,
        s.name AS software_name,
        rr.target_user_id,
        tu.full_name AS target_user_name,
        rr.requested_by,
        rr.justification,
        rr.status,
        rr.decided_by,
        rr.decided_at,
        rr.decision_notes,
        rr.created_at
      FROM reallocation_requests rr
      JOIN user_unavailability_periods uup ON uup.id = rr.unavailability_id
      JOIN users su ON su.id = uup.user_id
      LEFT JOIN users tu ON tu.id = rr.target_user_id
      LEFT JOIN assets a ON a.id = rr.asset_id
      LEFT JOIN license_allocations la ON la.id = rr.license_allocation_id
      LEFT JOIN license_inventory li ON li.id = la.license_inventory_id
      LEFT JOIN software s ON s.id = li.software_id
      WHERE rr.deleted_at IS NULL
      ORDER BY rr.created_at DESC;
    `,
  });
}

export default loadReallocationRequests;
