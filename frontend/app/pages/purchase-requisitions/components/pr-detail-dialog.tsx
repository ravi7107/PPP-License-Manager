import { useEffect, useState } from 'react';
import { Check, Download, Send, Trash2, Upload, X } from 'lucide-react';

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
}: PrDetailDialogProps) {
  const [attachmentType, setAttachmentType] =
    useState<AttachmentType>('VendorQuotation');
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDecisionRemarks('');
      setDownloadError(null);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {pr.prNumber ?? 'Draft'} — {pr.title}
            <Badge variant={statusVariant(pr.status)}>{pr.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            Requested by {pr.requestedByUserName} for {pr.companyName}
            {pr.vendorName ? ` · Vendor: ${pr.vendorName}` : ''}
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
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pr.lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell>{li.itemDescription}</TableCell>
                  <TableCell>{li.category ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {li.quantity} {li.unitOfMeasure ?? ''}
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
