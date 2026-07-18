import { action } from '@/lib/uibakery';

// Requester cancels their own still-pending request. No allocation changes occur.
function cancelRequest() {
  return action('cancelRequest', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE requests
      SET status = 'Cancelled', updated_by = {{params.actorName}}, updated_at = NOW()
      WHERE id = {{params.requestId}}::bigint AND status = 'Pending' AND deleted_at IS NULL
      RETURNING id;
    `,
  });
}

export default cancelRequest;
