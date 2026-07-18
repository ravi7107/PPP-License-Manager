import { action } from '@/lib/uibakery';

// Asset Utilization report: breakdown of assets by status (Active/In Repair/Retired/Decommissioned)
// with counts and percentage of total fleet.
function loadAssetUtilizationReport() {
  return action('loadAssetUtilizationReport', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH totals AS (
        SELECT COUNT(*) AS total_count FROM assets WHERE deleted_at IS NULL
      )
      SELECT
        a.status,
        COUNT(*) AS asset_count,
        COUNT(*) FILTER (WHERE a.assigned_user_id IS NOT NULL) AS assigned_count,
        COUNT(*) FILTER (WHERE a.assigned_user_id IS NULL) AS unassigned_count,
        ROUND(COUNT(*)::numeric / NULLIF((SELECT total_count FROM totals), 0) * 100, 1) AS percent_of_fleet
      FROM assets a
      WHERE a.deleted_at IS NULL
      GROUP BY a.status
      ORDER BY asset_count DESC;
    `,
  });
}

export default loadAssetUtilizationReport;
