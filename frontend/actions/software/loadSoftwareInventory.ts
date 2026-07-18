import { action } from '@/lib/uibakery';

function loadSoftwareInventory() {
  return action('loadSoftwareInventory', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        li.id,
        s.id AS software_id,
        s.name AS software_name,
        s.vendor,
        s.version,
        s.license_type,
        li.total_seats AS license_count,
        li.cost_per_license,
        li.cost AS total_cost,
        li.expiry_date,
        li.maintenance_expiry,
        li.status,
        li.entity_id,
        e.name AS entity_name,
        li.department_id,
        d.name AS department_name,
        li.client_id,
        c.name AS client_name,
        li.created_at,
        li.updated_at,
        li.created_by,
        li.updated_by,
        COALESCE(used.used_licenses, 0) AS used_licenses,
        GREATEST(li.total_seats - COALESCE(used.used_licenses, 0), 0) AS available_licenses,
        COALESCE(assoc_assets.assets, '') AS associated_assets,
        COALESCE(assoc_users.users, '') AS associated_users
      FROM license_inventory li
      JOIN software s ON s.id = li.software_id
      LEFT JOIN entities e ON e.id = li.entity_id
      LEFT JOIN departments d ON d.id = li.department_id
      LEFT JOIN clients c ON c.id = li.client_id
      LEFT JOIN (
        SELECT license_inventory_id, COUNT(*) AS used_licenses
        FROM license_allocations
        WHERE deleted_at IS NULL AND status = 'Active'
        GROUP BY license_inventory_id
      ) used ON used.license_inventory_id = li.id
      LEFT JOIN (
        SELECT la.license_inventory_id, STRING_AGG(DISTINCT a.asset_tag, ', ') AS assets
        FROM license_allocations la
        JOIN assets a ON a.id = la.asset_id
        WHERE la.deleted_at IS NULL AND la.status = 'Active'
        GROUP BY la.license_inventory_id
      ) assoc_assets ON assoc_assets.license_inventory_id = li.id
      LEFT JOIN (
        SELECT la.license_inventory_id, STRING_AGG(DISTINCT u.full_name, ', ') AS users
        FROM license_allocations la
        JOIN users u ON u.id = la.user_id
        WHERE la.deleted_at IS NULL AND la.status = 'Active'
        GROUP BY la.license_inventory_id
      ) assoc_users ON assoc_users.license_inventory_id = li.id
      WHERE li.deleted_at IS NULL
      ORDER BY li.created_at DESC;
    `,
  });
}

export default loadSoftwareInventory;
