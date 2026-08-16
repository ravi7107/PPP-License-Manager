import { cancelApiRequest } from '@/lib/api/requests.api';

// Requester cancels their own still-pending request. No allocation changes occur.
async function cancelRequest(params: { requestId: number; actorName: string; actorUserId: number }) {
  return cancelApiRequest(params.requestId, params.actorUserId);
}

export default cancelRequest;
