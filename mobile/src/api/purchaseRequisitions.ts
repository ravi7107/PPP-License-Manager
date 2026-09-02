import { apiClient, unwrap } from './client';
import { PurchaseRequisitionAvailableLineResponse } from '@/types/api';

// GET /PurchaseRequisition/available-lines[?prNumber=] - Extension 4,
// Phase 22. Same endpoint the web app's own "link to a PR" picker
// already uses; the optional prNumber filter (Phase 20, backend) scopes
// it to a single PR - what Add Asset's "Scan PR/PO QR" sub-flow needs
// after a scan. Open to any authenticated user, same as every other
// caller of this endpoint.
export async function getAvailableLines(
  prNumber?: string
): Promise<PurchaseRequisitionAvailableLineResponse[]> {
  const response = await apiClient.get('/PurchaseRequisition/available-lines', {
    params: prNumber ? { prNumber } : undefined,
  });
  return unwrap<PurchaseRequisitionAvailableLineResponse[]>(response.data);
}
