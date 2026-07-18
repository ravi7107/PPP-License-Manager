import { action } from '@/lib/uibakery';

// IT Administrator rejects a Pending request: records the decision and marks the request Rejected.
// No allocation changes occur.
function rejectRequest() {
  return action('rejectRequest', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH updated_request AS (
        UPDATE requests
        SET status = 'Rejected', updated_by = {{params.actorName}}, updated_at = NOW()
        WHERE id = {{params.requestId}}::bigint AND status = 'Pending' AND deleted_at IS NULL
        RETURNING id
      )
      INSERT INTO approvals (request_id, approver_id, approver_name, decision, comment, decided_at, status, created_by, updated_by)
      SELECT id, NULL, {{params.actorName}}, 'Rejected', {{params.comment}}, NOW(), 'Rejected', {{params.actorName}}, {{params.actorName}}
      FROM updated_request
      RETURNING request_id;
    `,
  });
}

export default rejectRequest;
