import { approveApiRequest } from '@/lib/api/requests.api';

// IT Administrator approves a Pending request: records the decision and
// marks the request Approved. Note: unlike the old (never-functional) SQL
// stub, this does not auto-create a license/asset allocation record - see
// the comment on Models/Request.cs for why. An administrator still
// performs the actual allocation separately via Licenses/Allocations/
// Hardware once a request is approved.
async function approveRequest(params: { requestId: number; comment: string | null; actorName: string; actorUserId: number }) {
  return approveApiRequest(params.requestId, params.actorUserId, params.comment);
}

export default approveRequest;
