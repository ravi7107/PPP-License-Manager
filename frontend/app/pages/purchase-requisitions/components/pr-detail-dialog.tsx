import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  AttachmentType,
  buildAttachmentUrl,
  downloadPurchaseRequisitionPdf,
  downloadPurchaseRequisitionPoDocument,
  downloadPurchaseRequisitionPoUploadDocument,
  downloadPurchaseRequisitionInvoiceDocument,
  PurchaseRequisition,
} from '@/lib/api/purchase-requisitions.api';

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Approved':
      return 'default';
    case 'Rejected':
      return 'destructive';
    case 'Draft':
      return 'outline';
    default:
      return 'secondary';
  }
}

interface PrDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseRequisition: PurchaseRequisition | null;
  currentUserId?: number | null;
  uploading: boolean;
  uploadError?: string | null;
  onUploadAttachment: (file: File, attachmentType: AttachmentType) => Promise<void>;
  onDeleteAttachment: (attachmentId: number) => Promise<void>;
  onOpenSubmit: () => void;
  deciding?: boolean;
  decisionError?: string | null;
  onDecide?: (approve: boolean, remarks: string) => Promise<void>;
  revising?: boolean;
  revisionError?: string | null;
  onCreateRevision?: () => Promise<void>;
  // Phase 7 - optional, same "omit to hide the capability" convention as
  // onDecide/onCreateRevision above. Callers that only need a read-only
  // view (e.g. pending-approvals-page.tsx) simply don't pass this, and the
  // upload form never renders - the invoice list itself (if any invoices
  // already exist) still shows regardless.
  invoiceUploading?: boolean;
  invoiceUploadError?: string | null;
  onUploadInvoice?: (
    file: File,
    invoiceNumber: string | null,
    invoiceDate: string | null,
    invoiceAmount: number | null,
    notes: string | null
  ) => Promise<void>;
}

export function PrDetailDialog({
  open,
  onOpenChange,
  purchaseRequisition,
  currentUserId,
  uploading,
  uploadError,
  onUploadAttachment,
  onDeleteAttachment,
  onOpenSubmit,
  deciding = false,
  decisionError,
  onDecide,
  revising = false,
  revisionError,
  onCreateRevision,
  invoiceUploading = false,
  invoiceUploadError,
  onUploadInvoice,
}: PrDetailDialogProps) {
  const [attachmentType, setAttachmentType] =
    useState<AttachmentType>('VendorQuotation');
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingPo, setDownloadingPo] = useState(false);
  const [poDownloadError, setPoDownloadError] = useState<string | null>(null);
  const [downloadingPoUploadId, setDownloadingPoUploadId] = useState<
    number | null
  >(null);
  const [poHistoryOpen, setPoHistoryOpen] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<
    number | null
  >(null);
  const [invoiceDownloadError, setInvoiceDownloadError] = useState<
    string | null
  >(null);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  useEffect(() => {
    if (open) {
      setDecisionRemarks('');
      setDownloadError(null);
      setInvoiceFormOpen(false);
      setInvoiceFile(null);
      setInvoiceNumber('');
      setInvoiceDate('');
      setInvoiceAmount('');
      setInvoiceNotes('');
    }
  }, [open, purchaseRequisition?.id]);

  if (!purchaseRequisition) {
    return null;
  }

  const pr = purchaseRequisition;
  const isDraft = pr.status === 'Draft';
  const canManageAttachments = pr.isOwner && isDraft;

  const currentStep = pr.approvalSteps.find(
    (s) => s.stepOrder === pr.currentApprovalStepOrder
  );

  const isCurrentApprover =
    pr.status === 'InApproval' &&
    !!currentStep &&
    currentStep.status === 'Pending' &&
    currentUserId != null &&
    currentStep.assignedApproverUserId === currentUserId;

  const selectFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.docx,.xlsx';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void onUploadAttachment(file, attachmentType);
    };
    input.click();
  };

  // Unlike attachment links, the PDF isn't a plain <a href> - it's only
  // reachable through an authenticated request (see
  // downloadPurchaseRequisitionPdf's comment), so it has to be fetched as
  // a blob and handed to the browser via a throwaway object URL.
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setDownloadError(null);

    try {
      const { blob, fileName } = await downloadPurchaseRequisitionPdf(pr.id);
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      // The request uses responseType: 'blob', so an error response body
      // (e.g. the backend's friendly 404 "No PDF is available..." message)
      // arrives as a Blob too, not parsed JSON - has to be read as text
      // and parsed before err.response.data.message would ever work.
      let message: string | undefined;

      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          message = JSON.parse(text)?.message;
        } catch {
          // Not JSON - fall through to the generic message below.
        }
      }

      setDownloadError(
        message ?? err?.message ?? 'Failed to download the PDF.'
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Same blob-fetch pattern as handleDownloadPdf above - the PO document
  // lives under the same private, authenticated-only storage area as the
  // PR PDF (see GetPoDocumentFileAsync's comment), so it can't be a plain
  // <a href> either.
  const handleDownloadPo = async () => {
    setDownloadingPo(true);
    setPoDownloadError(null);

    try {
      const { blob, fileName } = await downloadPurchaseRequisitionPoDocument(pr.id);
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      let message: string | undefined;

      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          message = JSON.parse(text)?.message;
        } catch {
          // Not JSON - fall through to the generic message below.
        }
      }

      setPoDownloadError(
        message ?? err?.message ?? 'Failed to download the PO document.'
      );
    } finally {
      setDownloadingPo(false);
    }
  };

  // Same blob-fetch pattern as handleDownloadPo, but for one specific past
  // upload from poUploadHistory rather than always "whatever's current" -
  // lets an older PO copy be retrieved after a later revision overwrote
  // the header.
  const handleDownloadPoUpload = async (poUploadId: number) => {
    setDownloadingPoUploadId(poUploadId);
    setPoDownloadError(null);

    try {
      const { blob, fileName } = await downloadPurchaseRequisitionPoUploadDocument(
        pr.id,
        poUploadId
      );
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      let message: string | undefined;

      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          message = JSON.parse(text)?.message;
        } catch {
          // Not JSON - fall through to the generic message below.
        }
      }

      setPoDownloadError(
        message ?? err?.message ?? 'Failed to download that PO document.'
      );
    } finally {
      setDownloadingPoUploadId(null);
    }
  };

  // Same blob-fetch pattern as handleDownloadPo/handleDownloadPoUpload, for
  // one specific invoice's uploaded document.
  const handleDownloadInvoice = async (invoiceId: number) => {
    setDownloadingInvoiceId(invoiceId);
    setInvoiceDownloadError(null);

    try {
      const { blob, fileName } = await downloadPurchaseRequisitionInvoiceDocument(
        pr.id,
        invoiceId
      );
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      let message: string | undefined;

      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          message = JSON.parse(text)?.message;
        } catch {
          // Not JSON - fall through to the generic message below.
        }
      }

      setInvoiceDownloadError(
        message ?? err?.message ?? 'Failed to download that invoice document.'
      );
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleSubmitInvoice = async () => {
    if (!onUploadInvoice || !invoiceFile) return;

    const parsedAmount = invoiceAmount.trim() ? Number(invoiceAmount) : null;

    await onUploadInvoice(
      invoiceFile,
      invoiceNumber.trim() || null,
      invoiceDate.trim() || null,
      parsedAmount != null && !Number.isNaN(parsedAmount) ? parsedAmount : null,
      invoiceNotes.trim() || null
    );

    setInvoiceFormOpen(false);
    setInvoiceFile(null);
    setInvoiceNumber('');
    setInvoiceDate('');
    setInvoiceAmount('');
    setInvoiceNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {pr.prNumber ?? 'Draft'} — {pr.title}
            <Badge variant={statusVariant(pr.status)}>{pr.status}</Badge>
            {pr.revisionNumber > 0 ? (
              <Badge variant="outline">Rev {String(pr.revisionNumber).padStart(2, '0')}</Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Requested by {pr.requestedByUserName} for {pr.companyName}
            {pr.initiatedByContactName
              ? ` · Initiated by: ${pr.initiatedByContactName}`
              : ''}
            {pr.vendorName ? ` · Vendor: ${pr.vendorName}` : ''}
            {pr.previousPrNumber ? ` · Revision of ${pr.previousPrNumber}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Subtotal</p>
            <p className="font-medium">
              {pr.currency} {pr.subtotalAmount.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">
              Tax (CGST {pr.cgstPercent}% + SGST {pr.sgstPercent}%)
            </p>
            <p className="font-medium">
              {pr.currency} {pr.taxAmount.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-medium">
              {pr.currency} {pr.totalAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {pr.justification ? (
          <div className="text-sm">
            <p className="text-muted-foreground">Justification</p>
            <p>{pr.justification}</p>
          </div>
        ) : null}

        {/* LINE ITEMS */}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Line Items</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pr.lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell>{li.itemDescription}</TableCell>
                  <TableCell>{li.category ?? '—'}</TableCell>
                  <TableCell className="text-right">{li.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {li.unitOfMeasure ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {li.unitPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {li.lineTotal.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* FULFILLED BY - read-only audit trail of Assets/LicensePurchases
            actually created against this PR's line items so far. Hidden
            entirely when empty (the normal case for most PRs, since
            linking an Asset/License to a PR is optional), so this never
            adds visual noise to a PR nobody has linked anything to. */}

        {pr.fulfilledByItems.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Fulfilled By</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Purchase Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pr.fulfilledByItems.map((item) => (
                  <TableRow key={`${item.type}-${item.recordId}`}>
                    <TableCell>
                      <Badge variant="outline">{item.type}</Badge>
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.cost != null ? item.cost.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.purchaseDate
                        ? new Date(item.purchaseDate).toLocaleDateString()
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {/* PURCHASE ORDER - PO Number/Date/Amount plus the upload history,
            wherever a PO has actually been uploaded via the Finance email
            link. Hidden entirely when no PO has ever been uploaded, same
            hidden-when-empty convention as Fulfilled By above. */}

        {pr.poNumber || pr.poDocumentPath || pr.poDate || pr.poAmount != null ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Purchase Order</h3>
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">PO Number</p>
                <p className="font-medium">{pr.poNumber ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">PO Date</p>
                <p className="font-medium">
                  {pr.poDate ? new Date(pr.poDate).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">PO Amount</p>
                <p className="font-medium">
                  {pr.poAmount != null
                    ? `${pr.currency} ${pr.poAmount.toFixed(2)}`
                    : '—'}
                </p>
              </div>
            </div>

            {pr.poUploadHistory.length > 0 ? (
              <div className="mt-3">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setPoHistoryOpen((v) => !v)}
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-150 ${
                      poHistoryOpen ? '' : '-rotate-90'
                    }`}
                  />
                  Upload History ({pr.poUploadHistory.length})
                </button>

                {poHistoryOpen ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>PO Date</TableHead>
                        <TableHead className="text-right">PO Amount</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pr.poUploadHistory.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell>{h.poNumber ?? '—'}</TableCell>
                          <TableCell>
                            {h.poDate
                              ? new Date(h.poDate).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {h.poAmount != null ? h.poAmount.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(h.uploadedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {h.uploadedByEmail ?? '—'}
                          </TableCell>
                          <TableCell>
                            {h.hasPoDocument ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={downloadingPoUploadId === h.id}
                                onClick={() => handleDownloadPoUpload(h.id)}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* INVOICES (Phase 7) - every invoice raised against this PR/PO so
            far, plus an upload form (only when the caller passed
            onUploadInvoice - read-only callers like the pending-approvals
            view simply omit it). Unlike Purchase Order above, this section
            is never hidden entirely - it always shows so the upload
            capability has an obvious home once a PR is Approved. */}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Invoices</h3>
            {pr.status === 'Approved' && onUploadInvoice ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInvoiceFormOpen((v) => !v)}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                Upload Invoice
              </Button>
            ) : null}
          </div>

          {invoiceUploadError ? (
            <div className="mb-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
              {invoiceUploadError}
            </div>
          ) : null}

          {invoiceFormOpen && onUploadInvoice ? (
            <div className="mb-3 rounded-md border border-border bg-muted/40 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Invoice Number (optional)</Label>
                  <input
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    placeholder="e.g. INV-2026-0042"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    disabled={invoiceUploading}
                  />
                </div>
                <div>
                  <Label className="text-xs">Invoice Date (optional)</Label>
                  <input
                    type="date"
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    disabled={invoiceUploading}
                  />
                </div>
                <div>
                  <Label className="text-xs">Invoice Amount (optional)</Label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    placeholder={`${pr.currency} amount`}
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    disabled={invoiceUploading}
                  />
                </div>
              </div>

              <div className="mt-3">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  className="mt-1"
                  placeholder="e.g. which shipment/receipt this invoice covers..."
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  disabled={invoiceUploading}
                />
              </div>

              <div className="mt-3">
                <Label className="text-xs">
                  Invoice Copy (PDF, JPG, PNG, DOCX, or XLSX)
                </Label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm file:mr-2 file:rounded file:border-0 file:bg-transparent"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                  disabled={invoiceUploading}
                />
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={invoiceUploading}
                  onClick={() => setInvoiceFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={invoiceUploading || !invoiceFile}
                  onClick={handleSubmitInvoice}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  {invoiceUploading ? 'Uploading...' : 'Submit Invoice'}
                </Button>
              </div>
            </div>
          ) : null}

          {pr.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead className="text-right">Invoice Amount</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pr.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.invoiceNumber ?? '—'}</TableCell>
                    <TableCell>
                      {inv.invoiceDate
                        ? new Date(inv.invoiceDate).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.invoiceAmount != null
                        ? inv.invoiceAmount.toFixed(2)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(inv.uploadedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {inv.uploadedByUserName ?? '—'}
                    </TableCell>
                    <TableCell>
                      {inv.hasInvoiceDocument ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={downloadingInvoiceId === inv.id}
                          onClick={() => handleDownloadInvoice(inv.id)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {invoiceDownloadError ? (
            <div className="mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
              {invoiceDownloadError}
            </div>
          ) : null}
        </div>

        {/* ATTACHMENTS */}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Attachments</h3>
            {canManageAttachments ? (
              <div className="flex items-center gap-2">
                <Select
                  value={attachmentType}
                  onValueChange={(v) => setAttachmentType(v as AttachmentType)}
                >
                  <SelectTrigger className="h-8 w-[170px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VendorQuotation">
                      Vendor Quotation
                    </SelectItem>
                    <SelectItem value="Supporting">Supporting Doc</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={selectFile}
                >
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            ) : null}
          </div>

          {uploadError ? (
            <div className="mb-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
              {uploadError}
            </div>
          ) : null}

          {pr.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments yet.</p>
          ) : (
            <ul className="space-y-1">
              {pr.attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <a
                      href={buildAttachmentUrl(a.storedPath)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 font-medium text-primary hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {a.fileName}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {a.attachmentType} · uploaded by{' '}
                      {a.uploadedByUserName ?? 'unknown'}
                    </p>
                  </div>
                  {canManageAttachments ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteAttachment(a.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* APPROVAL STEPS */}

        {pr.approvalSteps.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Approval Steps</h3>
            <ul className="space-y-1">
              {pr.approvalSteps.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>
                    Stage {s.stepOrder}: {s.assignedApproverUserName}
                    {s.approverType === 'Contact' ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (external)
                      </span>
                    ) : null}
                    {s.stepOrder === pr.currentApprovalStepOrder ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (current)
                      </span>
                    ) : null}
                  </span>
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* YOUR DECISION */}

        {isCurrentApprover && onDecide ? (
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <h3 className="mb-2 text-sm font-semibold">Your Decision</h3>

            {decisionError ? (
              <div className="mb-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
                {decisionError}
              </div>
            ) : null}

            <Label className="text-xs">
              Remarks {'(required to reject)'}
            </Label>
            <Textarea
              className="mt-1"
              placeholder="Add any remarks for the requester..."
              value={decisionRemarks}
              onChange={(e) => setDecisionRemarks(e.target.value)}
              disabled={deciding}
            />

            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={deciding}
                onClick={() => onDecide(false, decisionRemarks)}
              >
                <X className="mr-1.5 h-3.5 w-3.5" /> Reject
              </Button>
              <Button
                type="button"
                disabled={deciding}
                onClick={() => onDecide(true, decisionRemarks)}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
              </Button>
            </div>
          </div>
        ) : null}

        {downloadError ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            {downloadError}
          </div>
        ) : null}

        {poDownloadError ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            {poDownloadError}
          </div>
        ) : null}

        {revisionError ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            {revisionError}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {pr.status === 'Approved' ? (
            // Don't gate this on pr.pdfPath - the backend now generates
            // the PDF lazily on first download if it's missing (see
            // GetPdfFileAsync), so the button should always be offered
            // once a PR is Approved, not only after generation has
            // already happened to succeed once before.
            <Button
              type="button"
              variant="outline"
              disabled={downloadingPdf}
              onClick={handleDownloadPdf}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {downloadingPdf ? 'Downloading...' : 'Download PDF'}
            </Button>
          ) : null}
          {pr.poDocumentPath ? (
            // Only offered once Finance has actually uploaded a PO copy
            // through the /pr-finance/:token link - unlike the PR PDF,
            // there's no lazy-generation fallback here, so gate strictly
            // on the field being set rather than on status alone.
            <Button
              type="button"
              variant="outline"
              disabled={downloadingPo}
              onClick={handleDownloadPo}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {downloadingPo ? 'Downloading...' : 'Download PO'}
            </Button>
          ) : null}
          {pr.status === 'Approved' && pr.isOwner && onCreateRevision ? (
            // Clones this Approved PR into a new linked Draft
            // (RevisionNumber + 1) rather than ever editing the approved
            // row itself - see CreateRevisionAsync's comment. The new
            // draft opens straight into the edit form once created.
            <Button
              type="button"
              variant="outline"
              disabled={revising}
              onClick={onCreateRevision}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {revising ? 'Creating Revision...' : 'Create Revision'}
            </Button>
          ) : null}
          {pr.isOwner && isDraft ? (
            <Button type="button" onClick={onOpenSubmit}>
              <Send className="mr-1.5 h-3.5 w-3.5" /> Submit for Approval
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
