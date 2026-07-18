import { action } from '@/lib/uibakery';

// Entity-wise license report: total seats, used seats, and cost per entity (based on the
// entity the license pool is allocated to).
function loadEntityWiseReport() {
  return action('loadEntityWiseReport', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        COALESCE(e.name, 'Unassigned') AS entity_name,
        COUNT(DISTINCT li.software_id) AS software_titles,
        COALESCE(SUM(li.total_seats), 0) AS total_seats,
        COALESCE(SUM(used.used_licenses), 0) AS used_seats,
        COALESCE(SUM(li.cost), 0) AS total_cost
      FROM license_inventory li
      LEFT JOIN entities e ON e.id = li.entity_id
      LEFT JOIN (
        SELECT license_inventory_id, COUNT(*) AS used_licenses
        FROM license_allocations
        WHERE deleted_at IS NULL AND status = 'Active'
        GROUP BY license_inventory_id
      ) used ON used.license_inventory_id = li.id
      WHERE li.deleted_at IS NULL
      GROUP BY e.name
      ORDER BY total_cost DESC;
    `,
  });
}

export default loadEntityWiseReport;
