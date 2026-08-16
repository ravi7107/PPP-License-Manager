import api from './client';

// A standalone Initiator/Approver contact - name + email only, no login of
// their own (typically a Gmail or Office 365 address). Approval steps
// assigned to a Contact can only ever be decided via the secure link
// emailed to them (see PurchaseRequisitionApprovalStep's backend comment).
export type PurchaseRequisitionContactType = 'Initiator' | 'Approver' | 'Both';

export interface PurchaseRequisitionContact {
  id: number;
  fullName: string;
  email: string;
  contactType: PurchaseRequisitionContactType;
  companyId: number | null;
  companyName: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePurchaseRequisitionContactRequest {
  fullName: string;
  email: string;
  contactType: PurchaseRequisitionContactType;
  companyId?: number | null;
}

export interface UpdatePurchaseRequisitionContactRequest
  extends CreatePurchaseRequisitionContactRequest {
  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getPurchaseRequisitionContacts(): Promise<
  PurchaseRequisitionContact[]
> {
  const response = await api.get<ApiResponse<PurchaseRequisitionContact[]>>(
    '/PurchaseRequisitionContact'
  );

  return response.data.data;
}

export async function createPurchaseRequisitionContact(
  request: CreatePurchaseRequisitionContactRequest
): Promise<PurchaseRequisitionContact> {
  const response = await api.post<ApiResponse<PurchaseRequisitionContact>>(
    '/PurchaseRequisitionContact',
    request
  );

  return response.data.data;
}

export async function updatePurchaseRequisitionContact(
  id: number,
  request: UpdatePurchaseRequisitionContactRequest
): Promise<PurchaseRequisitionContact> {
  const response = await api.put<ApiResponse<PurchaseRequisitionContact>>(
    `/PurchaseRequisitionContact/${id}`,
    request
  );

  return response.data.data;
}

export async function deletePurchaseRequisitionContact(
  id: number
): Promise<void> {
  await api.delete(`/PurchaseRequisitionContact/${id}`);
}
