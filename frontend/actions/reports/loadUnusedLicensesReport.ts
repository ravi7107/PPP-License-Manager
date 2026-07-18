import { action } from '@/lib/uibakery';

// Unused Licenses report: license pools with zero or partial utilization, highlighting wasted spend.
function loadUnusedLicensesReport() {
  return action('loadUnusedLicensesReport', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        li.id,
        s.name AS software_name,
        s.vendor,
        li.total_seats,
        COALESCE(used.used_licenses, 0) AS used_seats,
        (li.total_seats - COALESCE(used.used_licenses, 0)) AS unused_seats,
        li.cost,
        CASE WHEN li.total_seats > 0
          THEN ROUND((li.total_seats - COALESCE(used.used_licenses, 0))::numeric / li.total_seats * COALESCE(li.cost, 0), 2)
          ELSE 0
        END AS wasted_cost,
        e.name AS entity_name,
        c.name AS client_name,
        li.status
      FROM license_inventory li
      JOIN software s ON s.id = li.software_id
      LEFT JOIN entities e ON e.id = li.entity_id
      LEFT JOIN clients c ON c.id = li.client_id
      LEFT JOIN (
        SELECT license_inventory_id, COUNT(*) AS used_licenses
        FROM license_allocations
        WHERE deleted_at IS NULL AND status = 'Active'
        GROUP BY license_inventory_id
      ) used ON used.license_inventory_id = li.id
      WHERE li.deleted_at IS NULL
        AND li.total_seats > COALESCE(used.used_licenses, 0)
      ORDER BY unused_seats DESC;
    `,
  });
}

export default loadUnusedLicensesReport;
