import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Check, X } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading purchase requisition…
            </CardContent>
          </Card>
        ) : loadError || !pr ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-red-700">
              {loadError ?? 'This approval link is invalid.'}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {pr.prNumber ?? 'Purchase Requisition'} — {pr.title}
                <Badge variant="secondary">
                  Stage {pr.stepOrder} of {pr.requiredApprovalStageCount}
                </Badge>
              </CardTitle>
              <CardDescription>
                Requested by {pr.requestedByUserName} for {pr.departmentName}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Subtotal</p>
                  <p className="font-medium">
                    {pr.currency} {pr.subtotalAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tax</p>
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

              {outcome ? (
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  Recorded: this purchase requisition was{' '}
                  <strong>{outcome.toLowerCase()}</strong> at stage{' '}
                  {pr.stepOrder}. You can close this page now.
                </div>
              ) : !canDecide ? (
                <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
