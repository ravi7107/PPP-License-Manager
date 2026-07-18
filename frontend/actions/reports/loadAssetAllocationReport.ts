import { action } from '@/lib/uibakery';

// Asset Allocation report: every asset with its current assignment (user/department/entity/client)
// and location, for allocation auditing.
function loadAssetAllocationReport() {
  return action('loadAssetAllocationReport', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        a.asset_tag,
        a.computer_name,
        a.asset_type,
        a.status,
        u.full_name AS assigned_user_name,
        d.name AS department_name,
        e.name AS entity_name,
        c.name AS client_name,
        COALESCE(NULLIF(a.location, ''), 'Unassigned') AS location,
        a.purchase_date,
        a.warranty_expiry
      FROM assets a
      LEFT JOIN users u ON u.id = a.assigned_user_id
      LEFT JOIN departments d ON d.id = a.department_id
      LEFT JOIN entities e ON e.id = a.entity_id
      LEFT JOIN clients c ON c.id = a.client_id
      WHERE a.deleted_at IS NULL
      ORDER BY a.computer_name NULLS LAST, a.asset_tag;
    `,
  });
}

export default loadAssetAllocationReport;
