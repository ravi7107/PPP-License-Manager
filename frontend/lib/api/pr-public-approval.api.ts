import api from './client';

// Deliberately narrower than PurchaseRequisitionLineItem in
// purchase-requisitions.api.ts - this is what the unauthenticated
// approval-link landing page is allowed to see, matching the backend's
// PublicPurchaseRequisitionApprovalResponse.
export interface PublicPurchaseRequisitionLineItem {
  id: number;
  lineNumber: number;
  itemDescription: string;
  category: string | null;
  quantity: number;
  unitOfMeasure: string | null;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
}

export interface PublicPurchaseRequisitionApproval {
  prNumber: string | null;
  title: string;
  justification: string | null;
  departmentName: string;
  requestedByUserName: string;
  currency: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  stepOrder: number;
  requiredApprovalStageCount: number;
  approverName: string;
  purchaseRequisitionStatus: string;
  stepStatus: string;
  isDecided: boolean;
  isExpired: boolean;
  lineItems: PublicPurchaseRequisitionLineItem[];
}

export interface DecidePublicPurchaseRequisitionRequest {
  approve: boolean;
  remarks?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// GET is read-only on the backend (see PublicPurchaseRequisitionApprovalResponse's
// comment) - safe to call as soon as the landing page mounts, including
// for an expired or already-decided link.
export async function getPublicPurchaseRequisitionApproval(
  token: string
): Promise<PublicPurchaseRequisitionApproval> {
  const response = await api.get<ApiResponse<PublicPurchaseRequisitionApproval>>(
    `/purchase-requisitions/public/${encodeURIComponent(token)}`
  );

  return response.data.data;
}

// Only called when the approver explicitly clicks Approve/Reject on the
// landing page - never on page load.
export async function decidePublicPurchaseRequisitionApproval(
  token: string,
  request: DecidePublicPurchaseRequisitionRequest
): Promise<PublicPurchaseRequisitionApproval> {
  const response = await api.post<ApiResponse<PublicPurchaseRequisitionApproval>>(
    `/purchase-requisitions/public/${encodeURIComponent(token)}/decision`,
    request
  );

  return response.data.data;
}
