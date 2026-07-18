import { action } from '@/lib/uibakery';

function loadAssetAllocationHistory() {
  return action('loadAssetAllocationHistory', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        aa.id,
        aa.action_type,
        aa.allocation_type,
        aa.allocation_date,
        aa.return_date,
        aa.status,
        aa.notes,
        u.full_name AS user_name,
        d.name AS department_name,
        e.name AS entity_name,
        c.name AS client_name,
        aa.created_by,
        aa.created_at
      FROM asset_allocations aa
      LEFT JOIN users u ON u.id = aa.user_id
      LEFT JOIN departments d ON d.id = aa.department_id
      LEFT JOIN entities e ON e.id = aa.entity_id
      LEFT JOIN clients c ON c.id = aa.client_id
      WHERE aa.asset_id = {{params.assetId}}::bigint AND aa.deleted_at IS NULL
      ORDER BY aa.created_at DESC;
    `,
  });
}

export default loadAssetAllocationHistory;
