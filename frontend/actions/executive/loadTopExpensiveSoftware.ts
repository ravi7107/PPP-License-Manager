import { action } from '@/lib/uibakery';

// Top 8 most expensive software titles by total license cost, with seat usage for context.
function loadTopExpensiveSoftware() {
  return action('loadTopExpensiveSoftware', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        s.name AS software_name,
        s.vendor,
        COALESCE(SUM(li.cost), 0) AS total_cost,
        COALESCE(SUM(li.total_seats), 0) AS total_seats,
        COALESCE(SUM(used.used_licenses), 0) AS used_seats,
        CASE WHEN COALESCE(SUM(li.total_seats), 0) > 0
          THEN ROUND(COALESCE(SUM(li.cost), 0) / SUM(li.total_seats), 2)
          ELSE 0
        END AS cost_per_seat
      FROM software s
      JOIN license_inventory li ON li.software_id = s.id AND li.deleted_at IS NULL
      LEFT JOIN (
        SELECT license_inventory_id, COUNT(*) AS used_licenses
        FROM license_allocations
        WHERE deleted_at IS NULL AND status = 'Active'
        GROUP BY license_inventory_id
      ) used ON used.license_inventory_id = li.id
      WHERE s.deleted_at IS NULL
      GROUP BY s.name, s.vendor
      ORDER BY total_cost DESC
      LIMIT 8;
    `,
  });
}

export default loadTopExpensiveSoftware;
