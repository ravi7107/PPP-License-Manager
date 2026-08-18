import api from './client';

// Deliberately narrower than PurchaseRequisitionLineItem in
// purchase-requisitions.api.ts - this is what the unauthenticated
// Finance-link landing page is allowed to see, matching the backend's
// PublicPurchaseRequisitionFinanceResponse.
export interface PublicPurchaseRequisitionFinanceLineItem {
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

export interface PublicPurchaseRequisitionQuotation {
  fileName: string;
  downloadUrl: string;
}

export interface PublicPurchaseRequisitionFinance {
  prNumber: string | null;
  title: string;
  companyName: string;
  requestedByUserName: string;
  vendorName: string | null;
  vendorGstin: string | null;
  currency: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  purchaseRequisitionStatus: string;
  isExpired: boolean;
  lineItems: PublicPurchaseRequisitionFinanceLineItem[];
  quotationAttachments: PublicPurchaseRequisitionQuotation[];
  // Reflects whatever was last uploaded through this link - null until
  // the first upload. The link stays usable afterward, so revisiting
  // shows what's already on file rather than looking blank.
  poNumber: string | null;
  hasPoDocument: boolean;
  poUploadedAt: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// GET is read-only on the backend - safe to call as soon as the landing
// page mounts, including for an expired link.
export async function getPublicPurchaseRequisitionFinance(
  token: string
): Promise<PublicPurchaseRequisitionFinance> {
  const response = await api.get<ApiResponse<PublicPurchaseRequisitionFinance>>(
    `/purchase-requisitions/public-finance/${encodeURIComponent(token)}`
  );

  return response.data.data;
}

// Only called when Finance explicitly submits the PO form - never on
// page load. Unlike the approval link, this link is reusable: calling
// this again simply replaces the previously uploaded PO copy/number and
// re-notifies the requester (see the backend's TokenHash comment).
export async function uploadPurchaseRequisitionPoByToken(
  token: string,
  file: File,
  poNumber: string | null
): Promise<PublicPurchaseRequisitionFinance> {
  const formData = new FormData();
  formData.append('file', file);
  if (poNumber) {
    formData.append('poNumber', poNumber);
  }

  const response = await api.post<ApiResponse<PublicPurchaseRequisitionFinance>>(
    `/purchase-requisitions/public-finance/${encodeURIComponent(token)}/po`,
    formData
  );

  return response.data.data;
}
