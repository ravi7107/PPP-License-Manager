import { action } from '@/lib/uibakery';

// Full approval decision history for a given request (maintains an audit trail of all decisions).
function loadApprovalHistory() {
  return action('loadApprovalHistory', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT id, request_id, approver_name, decision, comment, decided_at, created_at
      FROM approvals
      WHERE request_id = {{params.requestId}}::bigint AND deleted_at IS NULL
      ORDER BY created_at DESC;
    `,
  });
}

export default loadApprovalHistory;
