import { rejectApiRequest } from '@/lib/api/requests.api';

// IT Administrator rejects a Pending request: records the decision and
// marks the request Rejected. No allocation changes occur.
async function rejectRequest(params: { requestId: number; comment: string | null; actorName: string; actorUserId: number }) {
  return rejectApiRequest(params.requestId, params.actorUserId, params.comment);
}

export default rejectRequest;
