import { getApiRequestApprovals } from '@/lib/api/requests.api';
import { ApprovalRecord } from '@/app/pages/requests/types';

// Full approval decision history for a given request (maintains an audit
// trail of all decisions). Real REST call - requestId is undefined until
// a record is selected, in which case there's nothing to load yet.
async function loadApprovalHistory(params?: { requestId?: number }): Promise<ApprovalRecord[]> {
  if (!params?.requestId) return [];

  const rows = await getApiRequestApprovals(params.requestId);

  return rows.map((r) => ({
    id: r.id,
    request_id: r.requestId,
    approver_name: r.approverName,
    decision: r.decision as ApprovalRecord['decision'],
    comment: r.comment,
    decided_at: r.decidedAt,
    created_at: r.createdAt,
  }));
}

export default loadApprovalHistory;
