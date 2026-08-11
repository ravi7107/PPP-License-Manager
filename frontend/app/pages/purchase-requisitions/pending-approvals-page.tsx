import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Eye } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

import { KpiCard } from '@/components/layout/kpi-card';
import { useAuth } from '@/lib/auth/auth-context';

import {
  decidePurchaseRequisitionStep,
  getPendingApprovals,
  getPurchaseRequisition,
  PurchaseRequisition,
  PurchaseRequisitionPendingApproval,
} from '@/lib/api/purchase-requisitions.api';

import { PrDetailDialog } from '@/app/pages/purchase-requisitions/components/pr-detail-dialog';

export default function PendingApprovalsPage() {
  const { user } = useAuth();

  const [items, setItems] = useState<PurchaseRequisitionPendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPr, setDetailPr] = useState<PurchaseRequisition | null>(null);

  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await getPendingApprovals();
      setItems(data);
    } catch (err: any) {
      setListError(
        err?.response?.data?.message ?? err?.message ?? 'Failed to load pending approvals.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openDetail = async (row: PurchaseRequisitionPendingApproval) => {
    setPageError(null);
    try {
      const full = await getPurchaseRequisition(row.id);
      setDetailPr(full);
      setDecisionError(null);
      setDetailOpen(true);
    } catch (err: any) {
      setPageError(err?.response?.data?.message ?? 'Failed to load purchase requisition.');
    }
  };

  const handleDecide = async (approve: boolean, remarks: string) => {
    if (!detailPr) return;
    setDeciding(true);
    setDecisionError(null);
    try {
      await decidePurchaseRequisitionStep(detailPr.id, {
        approve,
        remarks: remarks || null,
      });
      setDetailOpen(false);
      await loadList();
    } catch (err: any) {
      setDecisionError(
        err?.response?.data?.message ?? err?.message ?? 'Failed to record your decision.'
      );
    } finally {
      setDeciding(false);
    }
  };

  const finalStageCount = items.filter(
    (i) => i.stepOrder === i.requiredApprovalStageCount
  ).length;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          Pending Approvals
        </h2>
        <p className="text-sm text-muted-foreground">
          Purchase requisitions waiting on your decision.
        </p>
      </div>

      {pageError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {pageError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard title="Awaiting Your Decision" value={items.length} icon={ClipboardCheck} />
        <KpiCard
          title="Final Stage"
          value={finalStageCount}
          icon={ClipboardCheck}
          tone={finalStageCount > 0 ? 'warning' : 'default'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Awaiting Your Approval</CardTitle>
          <CardDescription>
            Requisitions currently at a stage assigned to you.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {listError ? (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {listError}
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PR Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Loading pending approvals…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Nothing is waiting on your approval right now.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.prNumber ?? '—'}</TableCell>
                    <TableCell>{i.title}</TableCell>
                    <TableCell>{i.requestedByUserName}</TableCell>
                    <TableCell>{i.companyName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {i.stepOrder} of {i.requiredApprovalStageCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {i.currency} {i.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(i)}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PrDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        purchaseRequisition={detailPr}
        currentUserId={user?.userId}
        uploading={false}
        onUploadAttachment={async () => {}}
        onDeleteAttachment={async () => {}}
        onOpenSubmit={() => {}}
        deciding={deciding}
        decisionError={decisionError}
        onDecide={handleDecide}
      />
    </div>
  );
}
