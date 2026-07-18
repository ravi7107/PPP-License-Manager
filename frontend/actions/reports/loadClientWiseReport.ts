import { action } from '@/lib/uibakery';

// Client-wise license report combining both direct client-billed license pools
// (license_inventory.client_id) and seat-level allocations to assets tied to a client.
function loadClientWiseReport() {
  return action('loadClientWiseReport', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH pool_client AS (
        SELECT
          COALESCE(c.name, 'Unassigned') AS client_name,
          COUNT(DISTINCT li.software_id) AS software_titles,
          COALESCE(SUM(li.total_seats), 0) AS total_seats,
          COALESCE(SUM(li.cost), 0) AS total_cost
        FROM license_inventory li
        LEFT JOIN clients c ON c.id = li.client_id
        WHERE li.deleted_at IS NULL
        GROUP BY c.name
      ),
      seat_client AS (
        SELECT
          COALESCE(c.name, 'Unassigned') AS client_name,
          COUNT(*) AS allocated_seats
        FROM license_allocations la
        JOIN assets a ON a.id = la.asset_id
        LEFT JOIN clients c ON c.id = a.client_id
        WHERE la.deleted_at IS NULL AND la.status = 'Active'
        GROUP BY c.name
      )
      SELECT
        COALESCE(p.client_name, s.client_name) AS client_name,
        COALESCE(p.software_titles, 0) AS software_titles,
        COALESCE(p.total_seats, 0) AS total_seats,
        COALESCE(p.total_cost, 0) AS total_cost,
        COALESCE(s.allocated_seats, 0) AS allocated_seats
      FROM pool_client p
      FULL OUTER JOIN seat_client s ON s.client_name = p.client_name
      ORDER BY total_cost DESC;
    `,
  });
}

export default loadClientWiseReport;
