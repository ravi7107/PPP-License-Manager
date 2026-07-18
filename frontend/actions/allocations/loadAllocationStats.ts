import { action } from '@/lib/uibakery';

function loadAllocationStats() {
  return action('loadAllocationStats', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        COUNT(*) FILTER (WHERE status = 'Active') AS active_allocations,
        COUNT(*) FILTER (WHERE status = 'Active' AND is_temporary) AS temporary_allocations,
        COUNT(*) FILTER (WHERE status = 'Active' AND release_date IS NOT NULL AND release_date > CURRENT_DATE) AS scheduled_releases,
        COUNT(*) FILTER (WHERE status = 'Released') AS released_allocations
      FROM license_allocations
      WHERE deleted_at IS NULL;
    `,
  });
}

export default loadAllocationStats;
