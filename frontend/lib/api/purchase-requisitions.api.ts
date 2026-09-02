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

// Read-only audit trail: which Assets/LicensePurchases have actually been
// created against this PR's line items so far - empty for every PR with
// no linked Asset/LicensePurchase yet, which is the normal case since
// linking is optional.
export interface PurchaseRequisitionFulfillmentItem {
  type: 'Asset' | 'License';
  recordId: number;
  lineItemId: number;
  description: string;
  quantity: number;
  cost: number | null;
  purchaseDate: string | null;
}

// One row per past PO upload/re-upload via the Finance email link - a
// correction never loses the paper trail of what was on file before it.
export interface PurchaseRequisitionPoUpload {
  id: number;
  poNumber: string | null;
  poDate: string | null;
  poAmount: number | null;
  hasPoDocument: boolean;
  uploadedAt: string;
  uploadedByEmail: string | null;
}

// Phase 7 - one row per invoice raised against this PR/PO, oldest first.
// Deliberately a list, not more header fields alongside poNumber/poDate/
// poAmount above - a single PO commonly gets invoiced across more than one
// delivery. materialMovementReceiptId is set only when this invoice was
// tagged to a specific receive event at upload time.
export interface PurchaseRequisitionInvoice {
  id: number;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceAmount: number | null;
  hasInvoiceDocument: boolean;
  uploadedAt: string;
  uploadedByUserId: number;
  uploadedByUserName: string | null;
  materialMovementReceiptId: number | null;
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
  // Set once Finance uploads a PO copy via the emailed Finance link -
  // null until then. poUploadedByUserName is always null today (Finance
  // acts through that link, not an in-app account).
  poNumber: string | null;
  poDocumentPath: string | null;
  poUploadedAt: string | null;
  poUploadedByUserName: string | null;
  // Added alongside the 4 fields above (Phase 6) - all null for a PR
  // whose PO was uploaded before this shipped. poUploadHistory lists every
  // past upload/re-upload, oldest first - empty until a PO is uploaded.
  poDate: string | null;
  poAmount: number | null;
  poUploadedByEmail: string | null;
  poUploadHistory: PurchaseRequisitionPoUpload[];
  // Phase 7 - every invoice raised against this PR/PO so far, oldest
  // first. Empty until material is actually received/billed.
  invoices: PurchaseRequisitionInvoice[];
  createdAt: string;
  updatedAt: string | null;
  isOwner: boolean;
  // 0 for every PR created the normal way ("Rev 00"). Only > 0 on a
  // Draft created by createPurchaseRequisitionRevision from a
  // previously Approved one.
  revisionNumber: number;
  previousRevisionId: number | null;
  previousPrNumber: string | null;
  lineItems: PurchaseRequisitionLineItem[];
  attachments: PurchaseRequisitionAttachment[];
  approvalSteps: PurchaseRequisitionApprovalStep[];
  // Only populated on the single-PR detail fetch (getPurchaseRequisition),
  // not on list endpoints.
  fulfilledByItems: PurchaseRequisitionFulfillmentItem[];
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

// Clones an Approved PR into a new, linked Draft (RevisionNumber + 1,
// PreviousRevisionId set) - only the owner can call this, and only while
// the source PR is Approved (both enforced server-side). The new draft
// then goes through the exact same create/edit/submit flow as any other
// Draft - this call just creates it, same shape as
// createPurchaseRequisitionDraft's return.
export async function createPurchaseRequisitionRevision(
  approvedPrId: number
): Promise<PurchaseRequisition> {
  const response = await api.post<ApiResponse<PurchaseRequisition>>(
    `/PurchaseRequisition/${approvedPrId}/revise`
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

// Extension 4 - the PR's own QR (raw <svg>...</svg> markup, same
// content-only convention as the PDF's QR section), rendered inline on
// the detail dialog below. Same authenticated-only reasoning as the PDF
// above - fetched as text rather than linked as a plain <img src>, since
// the browser wouldn't attach the JWT to a bare image request either.
// 404s (Draft PR, no PrNumber yet) are left for the caller to catch and
// hide the section - this call doesn't swallow errors itself.
export async function getPurchaseRequisitionQrSvg(id: number): Promise<string> {
  const response = await api.get(`/PurchaseRequisition/${id}/qr`, {
    responseType: 'text',
    transformResponse: (data) => data,
  });

  return response.data;
}

// Same "not a static file, has to be fetched as a blob" reasoning as
// downloadPurchaseRequisitionPdf above - the PO document lives under the
// same private, non-wwwroot storage area (see the backend's
// GetPoDocumentFileAsync).
export async function downloadPurchaseRequisitionPoDocument(
  id: number
): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get(`/PurchaseRequisition/${id}/po-document`, {
    responseType: 'blob',
  });

  const disposition: string | undefined =
    response.headers?.['content-disposition'];
  const match = disposition?.match(/filename="?([^";]+)"?/i);

  return {
    blob: response.data,
    fileName: match?.[1] ?? `purchase-order-${id}`,
  };
}

// Same as downloadPurchaseRequisitionPoDocument, but for one specific
// past upload from poUploadHistory rather than always "whatever's
// current" - lets an earlier PO copy be downloaded after a later revision
// has overwritten the header.
export async function downloadPurchaseRequisitionPoUploadDocument(
  id: number,
  poUploadId: number
): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get(
    `/PurchaseRequisition/${id}/po-history/${poUploadId}/document`,
    { responseType: 'blob' }
  );

  const disposition: string | undefined =
    response.headers?.['content-disposition'];
  const match = disposition?.match(/filename="?([^";]+)"?/i);

  return {
    blob: response.data,
    fileName: match?.[1] ?? `purchase-order-${id}-v${poUploadId}`,
  };
}

// One Approved PR line item that still has remaining unfulfilled quantity -
// feeds an Asset/License purchase creation form's optional "link to a
// Purchase Requisition" picker.
export interface PurchaseRequisitionAvailableLine {
  lineItemId: number;
  purchaseRequisitionId: number;
  prNumber: string;
  itemDescription: string;
  quantity: number;
  fulfilledQuantity: number;
  remainingQuantity: number;
}

export async function getAvailablePurchaseRequisitionLines(): Promise<
  PurchaseRequisitionAvailableLine[]
> {
  const response = await api.get<
    ApiResponse<PurchaseRequisitionAvailableLine[]>
  >('/PurchaseRequisition/available-lines');

  return response.data.data;
}

// One row of the audit/reconciliation report - every Asset or
// LicensePurchase that has been linked back to the Purchase Requisition it
// was bought against, across the whole system.
export interface PurchaseRequisitionFulfillmentReportRow {
  type: 'Asset' | 'License';
  itemDescription: string;
  prNumber: string;
  poNumber: string | null;
  prApprovedAt: string | null;
  purchaseDate: string | null;
  vendor: string | null;
  cost: number | null;
  requestedByUserName: string;
  // Phase 9 - PO Date/Amount (Phase 6) and invoice totals (Phase 7),
  // duplicated per fulfilling row - see the backend DTO's own comment.
  poDate: string | null;
  poAmount: number | null;
  invoiceCount: number;
  totalInvoiceAmount: number | null;
  // Computed server-side (see PurchaseRequisitionFulfillmentReportRow's
  // ReconciliationFlag) - "OK" | "No PO" | "No Invoice" | "Amount Mismatch".
  reconciliationFlag: string;
}

export async function getPurchaseRequisitionFulfillmentReport(): Promise<
  PurchaseRequisitionFulfillmentReportRow[]
> {
  const response = await api.get<
    ApiResponse<PurchaseRequisitionFulfillmentReportRow[]>
  >('/PurchaseRequisition/fulfillment-report');

  return response.data.data;
}

// Phase 7 - authenticated in-app invoice upload, independent of Material
// Movement (materialMovementReceiptId is optional - see
// PurchaseRequisitionInvoice's own comment). Only the PR owner or a
// privileged user can call this, and only while the PR is Approved
// (enforced server-side).
export async function uploadPurchaseRequisitionInvoice(
  id: number,
  file: File,
  invoiceNumber: string | null,
  invoiceDate: string | null,
  invoiceAmount: number | null,
  materialMovementReceiptId?: number | null,
  notes?: string | null
): Promise<PurchaseRequisitionInvoice> {
  const formData = new FormData();
  formData.append('file', file);
  if (invoiceNumber) formData.append('invoiceNumber', invoiceNumber);
  if (invoiceDate) formData.append('invoiceDate', invoiceDate);
  if (invoiceAmount != null) formData.append('invoiceAmount', String(invoiceAmount));
  if (materialMovementReceiptId != null)
    formData.append('materialMovementReceiptId', String(materialMovementReceiptId));
  if (notes) formData.append('notes', notes);

  const response = await api.post<ApiResponse<PurchaseRequisitionInvoice>>(
    `/PurchaseRequisition/${id}/invoices`,
    formData
  );

  return response.data.data;
}

// Same "not a static file, has to be fetched as a blob" reasoning as
// downloadPurchaseRequisitionPoDocument above - invoice documents live
// under the same private, non-wwwroot storage area.
export async function downloadPurchaseRequisitionInvoiceDocument(
  id: number,
  invoiceId: number
): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get(
    `/PurchaseRequisition/${id}/invoices/${invoiceId}/document`,
    { responseType: 'blob' }
  );

  const disposition: string | undefined =
    response.headers?.['content-disposition'];
  const match = disposition?.match(/filename="?([^";]+)"?/i);

  return {
    blob: response.data,
    fileName: match?.[1] ?? `invoice-${id}-${invoiceId}`,
  };
}
