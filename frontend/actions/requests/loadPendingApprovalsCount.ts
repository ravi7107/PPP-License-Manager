import { action } from '@/lib/uibakery';

// Count of Pending requests, for the Approvals nav badge and dashboard KPI.
function loadPendingApprovalsCount() {
  return action('loadPendingApprovalsCount', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT COUNT(*)::int AS pending_count
      FROM requests
      WHERE status = 'Pending' AND deleted_at IS NULL;
    `,
  });
}

export default loadPendingApprovalsCount;
