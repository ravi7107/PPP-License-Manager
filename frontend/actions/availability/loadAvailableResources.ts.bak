import { action } from '@/lib/uibakery';

// Computes resources (assets + license seats) that are temporarily available because their
// owning user is currently within an Active unavailability window (today between start/end).
// These are NOT reassigned automatically - this is a read-only "available pool" view that all
// Team Leaders can see, used as the source list for reallocation requests.
function loadAvailableResources() {
  return action('loadAvailableResources', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH active_unavailability AS (
        SELECT uup.id AS unavailability_id, uup.user_id, uup.start_date, uup.end_date, uup.reason, u.full_name AS user_name
        FROM user_unavailability_periods uup
        JOIN users u ON u.id = uup.user_id
        WHERE uup.status = 'Active'
          AND uup.deleted_at IS NULL
          AND CURRENT_DATE BETWEEN uup.start_date AND uup.end_date
      )
      SELECT
        au.unavailability_id,
        au.user_id,
        au.user_name,
        au.start_date,
        au.end_date,
        au.reason,
        'Asset' AS resource_type,
        a.id AS asset_id,
        a.asset_tag AS resource_label,
        a.asset_type AS resource_subtype,
        NULL::bigint AS license_allocation_id,
        NULL::text AS software_name,
        rr.id AS pending_request_id,
        rr.status AS request_status
      FROM active_unavailability au
      JOIN assets a ON a.assigned_user_id = au.user_id AND a.deleted_at IS NULL AND a.status = 'Active'
      LEFT JOIN reallocation_requests rr
        ON rr.unavailability_id = au.unavailability_id AND rr.asset_id = a.id AND rr.status = 'Pending' AND rr.deleted_at IS NULL

      UNION ALL

      SELECT
        au.unavailability_id,
        au.user_id,
        au.user_name,
        au.start_date,
        au.end_date,
        au.reason,
        'License' AS resource_type,
        NULL::bigint AS asset_id,
        s.name AS resource_label,
        s.vendor AS resource_subtype,
        la.id AS license_allocation_id,
        s.name AS software_name,
        rr.id AS pending_request_id,
        rr.status AS request_status
      FROM active_unavailability au
      JOIN license_allocations la ON la.user_id = au.user_id AND la.deleted_at IS NULL AND la.status = 'Active'
      JOIN license_inventory li ON li.id = la.license_inventory_id
      JOIN software s ON s.id = li.software_id
      LEFT JOIN reallocation_requests rr
        ON rr.unavailability_id = au.unavailability_id AND rr.license_allocation_id = la.id AND rr.status = 'Pending' AND rr.deleted_at IS NULL

      ORDER BY user_name, resource_type, resource_label;
    `,
  });
}

export default loadAvailableResources;
