import api from './client';

export type PurchaseRequisitionStatus =
  | 'Draft'
  | 'Submitted'
  | 'InApproval'
  | 'Approved'
  | 'Rejected';

export type ApprovalStepStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Skipped';

export type AttachmentType = 'VendorQuotation' | 'Supporting';

export interface PurchaseRequisitionLineItem {
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

export interface PurchaseRequisitionAttachment {
  id: number;
  attachmentType: AttachmentType;
  fileName: string;
  storedPath: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedByUserId: number;
  uploadedByUserName: string | null;
  uploadedAt: string;
}

export interface PurchaseRequisitionApprovalStep {
  id: number;
  stepOrder: number;
  assignedApproverUserId: number;
  assignedApproverUserName: string;
  status: ApprovalStepStatus;
  decidedAt: string | null;
  remarks: string | null;
}

export interface PurchaseRequisition {
  id: number;
  prNumber: string | null;
  companyId: number;
  companyName: string | null;
  departmentId: number;
  departmentName: string;
  requestedByUserId: number;
  requestedByUserName: string;
  title: string;
  justification: string | null;
  status: PurchaseRequisitionStatus;
  requiredApprovalStageCount: number;
  currentApprovalStepOrder: number | null;
  currency: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  pdfPath: string | null;
  pdfGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  isOwner: boolean;
  lineItems: PurchaseRequisitionLineItem[];
  attachments: PurchaseRequisitionAttachment[];
  approvalSteps: PurchaseRequisitionApprovalStep[];
}

export interface PurchaseRequisitionListItem {
  id: number;
  prNumber: string | null;
  title: string;
  departmentName: string;
  status: PurchaseRequisitionStatus;
  currency: string;
  totalAmount: number;
  lineItemCount: number;
  createdAt: string;
  submittedAt: string | null;
}

export interface PurchaseRequisitionLineItemRequest {
  itemDescription: string;
  category?: string | null;
  quantity: number;
  unitOfMeasure?: string | null;
  unitPrice: number;
  notes?: string | null;
}

export interface SavePurchaseRequisitionRequest {
  departmentId: number;
  title: string;
  justification?: string | null;
  currency?: string | null;
  taxAmount?: number | null;
  lineItems: PurchaseRequisitionLineItemRequest[];
}

export interface ApprovalStageAssignment {
  stepOrder: number;
  approverUserId: number;
}

export interface SubmitPurchaseRequisitionRequest {
  approvalStages: ApprovalStageAssignment[];
}

export interface PurchaseRequisitionApproverCandidate {
  id: number;
  fullName: string;
  email: string;
  departmentName: string | null;
}

export interface PurchaseRequisitionPendingApproval {
  id: number;
  prNumber: string | null;
  title: string;
  departmentName: string;
  requestedByUserName: string;
  stepOrder: number;
  requiredApprovalStageCount: number;
  currency: string;
  totalAmount: number;
  submittedAt: string | null;
}

export interface DecidePurchaseRequisitionStepRequest {
  approve: boolean;
  remarks?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getMyPurchaseRequisitions(): Promise<
  PurchaseRequisitionListItem[]
> {
  const response = await api.get<
    ApiResponse<PurchaseRequisitionListItem[]>
  >('/PurchaseRequisition/mine');

  return response.data.data;
}

export async function getPurchaseRequisition(
  id: number
): Promise<PurchaseRequisition> {
  const response = await api.get<ApiResponse<PurchaseRequisition>>(
    `/PurchaseRequisition/${id}`
  );

  return response.data.data;
}

export async function createPurchaseRequisitionDraft(
  request: SavePurchaseRequisitionRequest
): Promise<PurchaseRequisition> {
  const response = await api.post<ApiResponse<PurchaseRequisition>>(
    '/PurchaseRequisition',
    request
  );

  return response.data.data;
}

export async function updatePurchaseRequisitionDraft(
  id: number,
  request: SavePurchaseRequisitionRequest
): Promise<PurchaseRequisition> {
  const response = await api.put<ApiResponse<PurchaseRequisition>>(
    `/PurchaseRequisition/${id}`,
    request
  );

  return response.data.data;
}

export async function deletePurchaseRequisitionDraft(
  id: number
): Promise<void> {
  await api.delete(`/PurchaseRequisition/${id}`);
}

export async function uploadPurchaseRequisitionAttachment(
  id: number,
  file: File,
  attachmentType: AttachmentType
): Promise<PurchaseRequisitionAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('attachmentType', attachmentType);

  const response = await api.post<
    ApiResponse<PurchaseRequisitionAttachment>
  >(`/PurchaseRequisition/${id}/attachments`, formData);

  return response.data.data;
}

export async function deletePurchaseRequisitionAttachment(
  id: number,
  attachmentId: number
): Promise<void> {
  await api.delete(
    `/PurchaseRequisition/${id}/attachments/${attachmentId}`
  );
}

export async function submitPurchaseRequisition(
  id: number,
  request: SubmitPurchaseRequisitionRequest
): Promise<PurchaseRequisition> {
  const response = await api.post<ApiResponse<PurchaseRequisition>>(
    `/PurchaseRequisition/${id}/submit`,
    request
  );

  return response.data.data;
}

export async function getApproverCandidates(): Promise<
  PurchaseRequisitionApproverCandidate[]
> {
  const response = await api.get<
    ApiResponse<PurchaseRequisitionApproverCandidate[]>
  >('/PurchaseRequisition/approver-candidates');

  return response.data.data;
}

export async function getPendingApprovals(): Promise<
  PurchaseRequisitionPendingApproval[]
> {
  const response = await api.get<
    ApiResponse<PurchaseRequisitionPendingApproval[]>
  >('/PurchaseRequisition/pending-approvals');

  return response.data.data;
}

export async function decidePurchaseRequisitionStep(
  id: number,
  request: DecidePurchaseRequisitionStepRequest
): Promise<PurchaseRequisition> {
  const response = await api.post<ApiResponse<PurchaseRequisition>>(
    `/PurchaseRequisition/${id}/decision`,
    request
  );

  return response.data.data;
}

// Attachment paths returned by the backend are web-relative
// (e.g. "/uploads/purchase-requisitions/12/abc.pdf") - prefix with the
// API's origin (stripping the trailing "/api") to build a browsable URL,
// same convention as office-floor-map.tsx's buildMapUrl.
export function buildAttachmentUrl(storedPath: string): string {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '');
  return `${base}${storedPath}`;
}
