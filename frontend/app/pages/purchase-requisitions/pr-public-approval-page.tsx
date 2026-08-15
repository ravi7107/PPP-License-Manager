import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  decidePublicPurchaseRequisitionApproval,
  getPublicPurchaseRequisitionApproval,
  PublicPurchaseRequisitionApproval,
} from '@/lib/api/pr-public-approval.api';

// Unauthenticated landing page reached from a purchase requisition
// approval email. Deliberately outside ProtectedRoute (see app.tsx) -
// the token in the URL is the only credential. Loading this page only
// ever does a read (GET) - Approve/Reject is a separate, explicit POST
// triggered by a button click, never by the page simply loading. That
// split matters: corporate email security scanners commonly pre-fetch
// links in an inbound email before a human opens it, and if merely
// loading the page could decide the PR, the scanner - not the approver -
// would end up deciding it.
export default function PrPublicApprovalPage() {
  const { token } = useParams<{ token: string }>();

  const [pr, setPr] = useState<PublicPurchaseRequisitionApproval | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [remarks, setRemarks] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'Approved' | 'Rejected' | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoadError('This approval link is missing its token.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const data = await getPublicPurchaseRequisitionApproval(token);
      setPr(data);
    } catch (err: any) {
      setLoadError(
        err?.response?.data?.message ??
          err?.message ??
          'This approval link is invalid.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDecide = async (approve: boolean) => {
    if (!token) return;

    setDeciding(true);
    setDecisionError(null);

    try {
      const updated = await decidePublicPurchaseRequisitionApproval(token, {
        approve,
        remarks: remarks || null,
      });
      setPr(updated);
      setOutcome(approve ? 'Approved' : 'Rejected');
    } catch (err: any) {
      setDecisionError(
        err?.response?.data?.message ??
          err?.message ??
          'Failed to record your decision.'
      );
    } finally {
      setDeciding(false);
    }
  };

  const canDecide =
    !!pr &&
    !outcome &&
    !pr.isExpired &&
    !pr.isDecided &&
    pr.purchaseRequisitionStatus === 'InApproval' &&
    pr.stepStatus === 'Pending';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-center text-xl font-bold text-slate-800">
          PPS License Manager
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
              {loadError ?? 'This approval link is invalid.'}
            </div>
          </div>
        ) : (
          <div className="nova-panel">
            <div className="nova-panel-toolbar">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {pr.prNumber ?? 'Purchase Requisition'} — {pr.title}
                  <span className="nova-pill nova-pill-pending">
                    <span className="nova-dot" />
                    Stage {pr.stepOrder} of {pr.requiredApprovalStageCount}
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

              {outcome ? (
                <div
                  className="rounded-md border px-4 py-3 text-sm"
                  style={{
                    borderColor: 'var(--nova-teal-500)',
                    background: 'var(--nova-teal-50)',
                    color: 'var(--nova-teal-600)',
                  }}
                >
                  Recorded: this purchase requisition was{' '}
                  <strong>{outcome.toLowerCase()}</strong> at stage{' '}
                  {pr.stepOrder}. You can close this page now.
                </div>
              ) : !canDecide ? (
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
                      ? 'This approval link has expired. Please ask the requester for a new one, or sign in to the app.'
                      : pr.purchaseRequisitionStatus !== 'InApproval'
                        ? `This purchase requisition is already ${pr.purchaseRequisitionStatus}.`
                        : `This approval stage has already been ${pr.stepStatus.toLowerCase()}.`}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <h3 className="mb-2 text-sm font-semibold">Your Decision</h3>

                  {decisionError ? (
                    <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {decisionError}
                    </div>
                  ) : null}

                  <Label className="text-xs">
                    Remarks {'(required to reject)'}
                  </Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Add any remarks for the requester..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={deciding}
                  />

                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deciding}
                      onClick={() => handleDecide(false)}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button
                      type="button"
                      disabled={deciding}
                      onClick={() => handleDecide(true)}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
                    </Button>
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
