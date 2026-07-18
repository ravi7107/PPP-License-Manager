import { action } from '@/lib/uibakery';

function loadAssets() {
  return action('loadAssets', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        a.id,
        a.asset_tag,
        a.asset_type,
        a.computer_name,
        a.host_name,
        a.serial_number,
        a.manufacturer,
        a.model,
        a.purchase_date,
        a.warranty_expiry,
        a.operating_system,
        a.location,
        a.status,
        a.remarks,
        a.assigned_user_id,
        u.full_name AS assigned_user_name,
        a.department_id,
        d.name AS department_name,
        a.entity_id,
        e.name AS entity_name,
        a.client_id,
        c.name AS client_name,
        a.created_at,
        a.updated_at,
        a.created_by,
        a.updated_by
      FROM assets a
      LEFT JOIN users u ON u.id = a.assigned_user_id
      LEFT JOIN departments d ON d.id = a.department_id
      LEFT JOIN entities e ON e.id = a.entity_id
      LEFT JOIN clients c ON c.id = a.client_id
      WHERE a.deleted_at IS NULL
      ORDER BY a.created_at DESC;
    `,
  });
}

export default loadAssets;
