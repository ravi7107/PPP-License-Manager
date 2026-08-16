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

// "User" (an existing system User) or "Contact" (a standalone, no-login
// PurchaseRequisitionContact - identified by email only, can only decide
// their step via the emailed approval link).
export type ApproverType = 'User' | 'Contact';

export interface PurchaseRequisitionApprovalStep {
  id: number;
  stepOrder: number;
  assignedApproverUserId: number | null;
  assignedApproverContactId: number | null;
  approverType: ApproverType;
  assignedApproverUserName: string;
  assignedApproverEmail: string | null;
  status: ApprovalStepStatus;
  decidedAt: string | null;
  remarks: string | null;
}

export interface PurchaseRequisition {
  id: number;
  prNumber: string | null;
  companyId: number;
  companyName: string | null;
  // Optional - no longer collected on the New Purchase Requisition form
  // (Entity/Company above replaces it), null for PRs created after this
  // change. Kept for PRs created before it.
  departmentId: number | null;
  departmentName: string | null;
  // Optional - null when no vendor has been selected for this PR yet.
  vendorId: number | null;
  vendorName: string | null;
  requestedByUserId: number;
  requestedByUserName: string;
  // Optional - who this PR is being raised on behalf of, when that's a
  // different person from the logged-in requester. Purely informational.
  initiatedByContactId: number | null;
  initiatedByContactName: string | null;
  title: string;
  justification: string | null;
  status: PurchaseRequisitionStatus;
  requiredApprovalStageCount: number;
  currentApprovalStepOrder: number | null;
  currency: string;
  subtotalAmount: number;
  cgstPercent: number;
  sgstPercent: number;
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
  companyName: string;
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
  // The Entity (Company) this PR is raised under.
  companyId: number;
  // Optional - a PR doesn't have to have a single named vendor decided
  // yet (e.g. still gathering quotes).
  vendorId?: number | null;
  title: string;
  justification?: string | null;
  // Optional - who this PR is being raised on behalf of, when that's a
  // different person from the logged-in requester. Purely informational.
  initiatedByContactId?: number | null;
  currency?: string | null;
  // Optional - null/omitted defaults to 9% each (18% combined GST) on the
  // backend, but changeable per PR.
  cgstPercent?: number | null;
  sgstPercent?: number | null;
  lineItems: PurchaseRequisitionLineItemRequest[];
}

export interface ApprovalStageAssignment {
  stepOrder: number;
  // Exactly one of these must be set - an existing system User or a
  // standalone Contact (external, no login).
  approverUserId?: number | null;
  approverContactId?: number | null;
}

export interface SubmitPurchaseRequisitionRequest {
  approvalStages: ApprovalStageAssignment[];
}

export interface PurchaseRequisitionApproverCandidate {
  id: number;
  fullName: string;
  email: string;
  departmentName: string | null;
  candidateType: ApproverType;
}

export interface PurchaseRequisitionPendingApproval {
  id: number;
  prNumber: string | null;
  title: string;
  companyName: string;
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

// Scoped to a specific purchase requisition - eligibility depends on the
// PR's own company (the Entity selected at Draft creation),
// not the requester's personal company, so the candidate list can differ
// PR-to-PR for the same requester.
export async function getApproverCandidates(
  id: number
): Promise<PurchaseRequisitionApproverCandidate[]> {
  const response = await api.get<
    ApiResponse<PurchaseRequisitionApproverCandidate[]>
  >(`/PurchaseRequisition/${id}/approver-candidates`);

  return response.data.data;
}

// Not scoped to a specific PR id (unlike getApproverCandidates) - the
// create/edit form doesn't have a saved PR id yet when a Draft is first
// being composed. companyId is optional; when provided, narrows to that
// company's own contacts plus org-wide ones. Contacts only (ContactType
// "Initiator" or "Both") - there's no equivalent "on behalf of another
// User" concept, so this never includes system Users.
export async function getInitiatorCandidates(
  companyId?: number | null
): Promise<PurchaseRequisitionApproverCandidate[]> {
  const response = await api.get<
    ApiResponse<PurchaseRequisitionApproverCandidate[]>
  >('/PurchaseRequisition/initiator-candidates', {
    params: companyId ? { companyId } : undefined,
  });

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

// Unlike attachments, the generated PDF is NOT a static file under
// wwwroot (see the backend's GetPdfStorageRootPath) - it can only be
// read through this authenticated endpoint, so a plain <a href> can't
// be used (the browser wouldn't attach the JWT). Fetches the file as a
// blob instead; the caller is responsible for turning that into a
// download (see pr-detail-dialog.tsx's handleDownloadPdf).
export async function downloadPurchaseRequisitionPdf(
  id: number
): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get(`/PurchaseRequisition/${id}/pdf`, {
    responseType: 'blob',
  });

  const disposition: string | undefined =
    response.headers?.['content-disposition'];
  const match = disposition?.match(/filename="?([^";]+)"?/i);

  return {
    blob: response.data,
    fileName: match?.[1] ?? `purchase-requisition-${id}.pdf`,
  };
}
