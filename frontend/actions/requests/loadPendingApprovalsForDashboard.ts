import { action } from '@/lib/uibakery';

// Top pending requests for the Executive Dashboard's "Pending Approvals" widget.
function loadPendingApprovalsForDashboard() {
  return action('loadPendingApprovalsForDashboard', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        r.id,
        r.request_type,
        r.requester_name,
        d.name AS department_name,
        s.name AS software_name,
        r.created_at
      FROM requests r
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN software s ON s.id = r.software_id
      WHERE r.status = 'Pending' AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC
      LIMIT 6;
    `,
  });
}

export default loadPendingApprovalsForDashboard;
