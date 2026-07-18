import { action } from '@/lib/uibakery';

function loadAllocations() {
  return action('loadAllocations', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        la.id,
        la.license_inventory_id,
        s.id AS software_id,
        s.name AS software_name,
        s.vendor,
        la.allocation_type,
        la.user_id,
        u.full_name AS user_name,
        la.asset_id,
        a.asset_tag,
        a.computer_name,
        la.entity_id,
        e.name AS entity_name,
        la.client_id,
        c.name AS client_name,
        la.allocation_date,
        la.release_date,
        la.is_temporary,
        la.share_end_date,
        la.status,
        la.notes,
        la.created_at,
        la.updated_at,
        la.created_by,
        la.updated_by
      FROM license_allocations la
      JOIN license_inventory li ON li.id = la.license_inventory_id
      JOIN software s ON s.id = li.software_id
      LEFT JOIN users u ON u.id = la.user_id
      LEFT JOIN assets a ON a.id = la.asset_id
      LEFT JOIN entities e ON e.id = la.entity_id
      LEFT JOIN clients c ON c.id = la.client_id
      WHERE la.deleted_at IS NULL
      ORDER BY la.created_at DESC;
    `,
  });
}

export default loadAllocations;
