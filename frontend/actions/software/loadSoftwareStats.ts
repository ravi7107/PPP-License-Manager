import { action } from '@/lib/uibakery';

function loadSoftwareStats() {
  return action('loadSoftwareStats', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        COUNT(*) AS total_titles,
        COALESCE(SUM(li.total_seats), 0) AS total_licenses,
        COALESCE(SUM(used.used_licenses), 0) AS used_licenses,
        COALESCE(SUM(GREATEST(li.total_seats - COALESCE(used.used_licenses, 0), 0)), 0) AS available_licenses,
        COALESCE(SUM(li.total_seats * li.cost_per_license), 0) AS total_cost,
        COUNT(*) FILTER (WHERE li.expiry_date IS NOT NULL AND li.expiry_date <= CURRENT_DATE + INTERVAL '30 days') AS expiring_soon,
        COUNT(*) FILTER (WHERE li.maintenance_expiry IS NOT NULL AND li.maintenance_expiry <= CURRENT_DATE + INTERVAL '30 days') AS maintenance_expiring_soon,
        CASE WHEN COALESCE(SUM(li.total_seats), 0) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(li.total_seats * li.cost_per_license), 0) / SUM(li.total_seats), 2)
        END AS avg_cost_per_license,
        CASE WHEN COALESCE(SUM(li.total_seats), 0) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(used.used_licenses), 0)::numeric / SUM(li.total_seats) * 100, 1)
        END AS utilization_pct
      FROM license_inventory li
      LEFT JOIN (
        SELECT license_inventory_id, COUNT(*) AS used_licenses
        FROM license_allocations
        WHERE deleted_at IS NULL AND status = 'Active'
        GROUP BY license_inventory_id
      ) used ON used.license_inventory_id = li.id
      WHERE li.deleted_at IS NULL;
    `,
  });
}

export default loadSoftwareStats;
