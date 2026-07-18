import { action } from '@/lib/uibakery';

// Global search: matches employees (users) by name or email.
// Returns department/entity context plus counts of assigned assets and active license allocations.
function searchEmployees() {
  return action('searchEmployees', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.is_team_leader,
        u.status,
        d.name AS department_name,
        e.name AS entity_name,
        (SELECT COUNT(*) FROM assets a WHERE a.assigned_user_id = u.id AND a.deleted_at IS NULL) AS assigned_asset_count,
        (SELECT COUNT(*) FROM license_allocations la WHERE la.user_id = u.id AND la.deleted_at IS NULL AND la.status = 'Active') AS active_license_count,
        (
          SELECT ARRAY_AGG(DISTINCT a.asset_tag)
          FROM assets a
          WHERE a.assigned_user_id = u.id AND a.deleted_at IS NULL
        ) AS assigned_assets,
        (
          SELECT ARRAY_AGG(DISTINCT s.name)
          FROM license_allocations la
          JOIN license_inventory li ON li.id = la.license_inventory_id
          JOIN software s ON s.id = li.software_id
          WHERE la.user_id = u.id AND la.deleted_at IS NULL AND la.status = 'Active'
        ) AS allocated_software
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN entities e ON e.id = u.entity_id
      WHERE u.deleted_at IS NULL
        AND (u.full_name ILIKE {{params.q}} OR u.email ILIKE {{params.q}})
      ORDER BY u.full_name
      LIMIT 25;
    `,
  });
}

export default searchEmployees;
