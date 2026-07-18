import { action } from '@/lib/uibakery';

// Software license pools with computed available seats, for the request form's software selector.
function loadSoftwareForRequests() {
  return action('loadSoftwareForRequests', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        li.id AS license_inventory_id,
        s.name AS software_name,
        s.vendor,
        li.total_seats,
        GREATEST(li.total_seats - COALESCE(used.used_licenses, 0), 0) AS available_licenses
      FROM license_inventory li
      JOIN software s ON s.id = li.software_id
      LEFT JOIN (
        SELECT license_inventory_id, COUNT(*) AS used_licenses
        FROM license_allocations
        WHERE deleted_at IS NULL AND status = 'Active'
        GROUP BY license_inventory_id
      ) used ON used.license_inventory_id = li.id
      WHERE li.deleted_at IS NULL AND li.status = 'Active'
      ORDER BY s.name;
    `,
  });
}

export default loadSoftwareForRequests;
