import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Check, FileText, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  getPublicPurchaseRequisitionFinance,
  uploadPurchaseRequisitionPoByToken,
  PublicPurchaseRequisitionFinance,
} from '@/lib/api/pr-public-finance.api';

// Unauthenticated landing page reached from the "Purchase Requisition
// Approved" Finance notification email. Deliberately outside
// ProtectedRoute (see app.tsx) - the token in the URL is the only
// credential. Loading this page only ever does a read (GET); uploading
// the PO is a separate, explicit POST triggered by a button click -
// same "don't let a link-scanner take action" reasoning as
// pr-public-approval-page.tsx, even though this link isn't single-use.
export default function PrPublicFinancePage() {
  const { token } = useParams<{ token: string }>();

  const [pr, setPr] = useState<PublicPurchaseRequisitionFinance | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [poAmount, setPoAmount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoadError('This Finance link is missing its token.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const data = await getPublicPurchaseRequisitionFinance(token);
      setPr(data);
      setPoNumber(data.poNumber ?? '');
      setPoDate(data.poDate ? data.poDate.slice(0, 10) : '');
      setPoAmount(data.poAmount != null ? String(data.poAmount) : '');
    } catch (err: any) {
      setLoadError(
        err?.response?.data?.message ??
          err?.message ??
          'This Finance link is invalid.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async () => {
    if (!token || !file) return;

    setUploading(true);
    setUploadError(null);
    setJustUploaded(false);

    try {
      const parsedAmount = poAmount.trim() ? Number(poAmount) : null;
      const updated = await uploadPurchaseRequisitionPoByToken(
        token,
        file,
        poNumber.trim() || null,
        poDate.trim() || null,
        parsedAmount != null && !Number.isNaN(parsedAmount) ? parsedAmount : null
      );
      setPr(updated);
      setFile(null);
      setJustUploaded(true);
    } catch (err: any) {
      setUploadError(
        err?.response?.data?.message ??
          err?.message ??
          'Failed to upload the PO document.'
      );
    } finally {
      setUploading(false);
    }
  };

  const canUpload =
    !!pr && !pr.isExpired && pr.purchaseRequisitionStatus === 'Approved';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-center text-xl font-bold text-slate-800">
          PPS SmartAsset
        </h1>

        {loading ? (
          <div className="nova-panel">
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading purchase requisition…
            </div>
          </div>
        ) : loadError || !pr ? (
          <div className="nova-panel">
            <div className="py-10 text-center text-sm text-destructive">
              {loadError ?? 'This Finance link is invalid.'}
            </div>
          </div>
        ) : (
          <div className="nova-panel">
            <div className="nova-panel-toolbar">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {pr.prNumber ?? 'Purchase Requisition'} — {pr.title}
                  <span className="nova-pill nova-pill-success">
                    <span className="nova-dot" />
                    {pr.purchaseRequisitionStatus}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Requested by {pr.requestedByUserName} for {pr.companyName}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Vendor</p>
                  <p className="font-medium">{pr.vendorName ?? 'Not selected'}</p>
                  {pr.vendorGstin ? (
                    <p className="text-xs text-muted-foreground">
                      GSTIN: {pr.vendorGstin}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-muted-foreground">Subtotal + Tax</p>
                  <p className="font-medium">
                    {pr.currency} {pr.subtotalAmount.toFixed(2)} +{' '}
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

              <div>
                <h3 className="mb-2 text-sm font-semibold">Line Items</h3>
                <div className="nova-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Category</th>
                        <th className="nova-right">Qty</th>
                        <th>Unit</th>
                        <th className="nova-right">Unit Price</th>
                        <th className="nova-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pr.lineItems.map((li) => (
                        <tr key={li.id}>
                          <td>{li.itemDescription}</td>
                          <td className="nova-cell-sub">{li.category ?? '—'}</td>
                          <td className="nova-right">{li.quantity}</td>
                          <td className="nova-cell-sub">
                            {li.unitOfMeasure ?? '—'}
                          </td>
                          <td className="nova-right">
                            {li.unitPrice.toFixed(2)}
                          </td>
                          <td className="nova-right">
                            {li.lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {pr.quotationAttachments.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Vendor Quotation
                  </h3>
                  <div className="space-y-1">
                    {pr.quotationAttachments.map((qa) => (
                      <a
                        key={qa.downloadUrl}
                        href={qa.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {qa.fileName}
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No vendor quotation was attached to this purchase requisition.
                </p>
              )}

              {!canUpload ? (
                <div
                  className="flex items-center gap-2 rounded-md border p-3 text-sm"
                  style={{
                    borderColor: 'var(--nova-amber-500)',
                    background: 'var(--nova-amber-50)',
                    color: 'var(--nova-amber-600)',
                  }}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p>
                    {pr.isExpired
                      ? 'This Finance link has expired. Please ask the requester to have a new notification sent.'
                      : `This purchase requisition is ${pr.purchaseRequisitionStatus}, not Approved.`}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <h3 className="mb-2 text-sm font-semibold">
                    {pr.hasPoDocument ? 'Replace PO Copy' : 'Upload PO Copy'}
                  </h3>

                  {pr.hasPoDocument ? (
                    <div className="mb-3 rounded-md border border-teal-300 bg-teal-50 px-3 py-2 text-xs text-teal-700">
                      A PO copy is already on file
                      {pr.poNumber ? ` (PO Number: ${pr.poNumber})` : ''}
                      {pr.poDate ? `, dated ${new Date(pr.poDate).toLocaleDateString()}` : ''}
                      {pr.poAmount != null ? `, ${pr.currency} ${pr.poAmount.toFixed(2)}` : ''}
                      {pr.poUploadedAt
                        ? ` — uploaded ${new Date(pr.poUploadedAt).toLocaleString()}`
                        : ''}
                      . Uploading a new file below will replace it and notify the requester again.
                    </div>
                  ) : null}

                  {justUploaded ? (
                    <div className="mb-3 flex items-center gap-2 rounded-md border border-teal-300 bg-teal-50 px-3 py-2 text-xs text-teal-700">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      PO uploaded. The requester has been emailed a copy.
                    </div>
                  ) : null}

                  {uploadError ? (
                    <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {uploadError}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <Label className="text-xs">PO Number (optional)</Label>
                        <Input
                          className="mt-1"
                          placeholder="e.g. PO-2026-0042"
                          value={poNumber}
                          onChange={(e) => setPoNumber(e.target.value)}
                          disabled={uploading}
                        />
                      </div>

                      <div>
                        <Label className="text-xs">PO Date (optional)</Label>
                        <Input
                          className="mt-1"
                          type="date"
                          value={poDate}
                          onChange={(e) => setPoDate(e.target.value)}
                          disabled={uploading}
                        />
                      </div>

                      <div>
                        <Label className="text-xs">PO Amount (optional)</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={`${pr.currency} amount`}
                          value={poAmount}
                          onChange={(e) => setPoAmount(e.target.value)}
                          disabled={uploading}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">PO Copy (PDF, JPG, PNG, DOCX, or XLSX)</Label>
                      <Input
                        className="mt-1"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        disabled={uploading}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        disabled={uploading || !file}
                        onClick={handleUpload}
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        {uploading ? 'Uploading...' : 'Confirm & Notify Initiator'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
