import { action } from '@/lib/uibakery';

// For a selected software title, returns every seat-level allocation with the entity, client,
// department, and location utilizing it — used for the software drill-down report.
function loadSoftwareUtilizationReport() {
  return action('loadSoftwareUtilizationReport', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        li.id AS license_inventory_id,
        s.name AS software_name,
        s.vendor,
        COALESCE(pool_e.name, alloc_e.name, 'Unassigned') AS entity_name,
        COALESCE(d.name, 'Unassigned') AS department_name,
        COALESCE(pool_c.name, alloc_c.name, 'Unassigned') AS client_name,
        COALESCE(NULLIF(a.location, ''), 'Unassigned') AS location,
        a.asset_tag,
        a.computer_name,
        u.full_name AS user_name,
        la.allocation_date,
        la.status AS allocation_status
      FROM license_allocations la
      JOIN license_inventory li ON li.id = la.license_inventory_id
      JOIN software s ON s.id = li.software_id
      LEFT JOIN entities pool_e ON pool_e.id = li.entity_id
      LEFT JOIN departments d ON d.id = li.department_id
      LEFT JOIN clients pool_c ON pool_c.id = li.client_id
      LEFT JOIN assets a ON a.id = la.asset_id
      LEFT JOIN entities alloc_e ON alloc_e.id = a.entity_id
      LEFT JOIN clients alloc_c ON alloc_c.id = a.client_id
      LEFT JOIN users u ON u.id = la.user_id
      WHERE la.deleted_at IS NULL AND li.deleted_at IS NULL AND s.id = {{params.softwareId}}::bigint
      ORDER BY la.allocation_date DESC;
    `,
  });
}

export default loadSoftwareUtilizationReport;
