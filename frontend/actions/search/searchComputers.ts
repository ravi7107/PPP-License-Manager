import { action } from '@/lib/uibakery';

// Global search: matches computers/assets by tag, computer name, host name, or serial number.
// Returns related entity/department/client/assigned-user context plus installed software names.
function searchComputers() {
  return action('searchComputers', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        a.id,
        a.asset_tag,
        a.computer_name,
        a.host_name,
        a.serial_number,
        a.asset_type,
        a.model,
        a.status,
        a.manufacturer,
        a.operating_system,
        a.location,
        e.name AS entity_name,
        d.name AS department_name,
        c.name AS client_name,
        u.full_name AS assigned_user_name,
        (
          SELECT ARRAY_AGG(DISTINCT s.name)
          FROM software_installations si
          JOIN software s ON s.id = si.software_id
          WHERE si.asset_id = a.id AND si.deleted_at IS NULL AND si.status = 'Active'
        ) AS installed_software
      FROM assets a
      LEFT JOIN entities e ON e.id = a.entity_id
      LEFT JOIN departments d ON d.id = a.department_id
      LEFT JOIN clients c ON c.id = a.client_id
      LEFT JOIN users u ON u.id = a.assigned_user_id
      WHERE a.deleted_at IS NULL
        AND (
          a.asset_tag ILIKE {{params.q}}
          OR a.computer_name ILIKE {{params.q}}
          OR a.host_name ILIKE {{params.q}}
          OR a.serial_number ILIKE {{params.q}}
        )
      ORDER BY a.computer_name NULLS LAST, a.asset_tag
      LIMIT 25;
    `,
  });
}

export default searchComputers;
