import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Pending Approvals</h1>
          <p className="nova-cmdbar-desc">
            Purchase requisitions waiting on your decision.
          </p>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div>
            <div className="text-sm font-semibold text-foreground">Awaiting Your Approval</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Requisitions currently at a stage assigned to you.
            </p>
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {items.length} pending
          </span>
        </div>

        {listError ? (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {listError}
          </div>
        ) : null}

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>PR Number</th>
                <th>Title</th>
                <th>Requested By</th>
                <th>Entity</th>
                <th>Stage</th>
                <th className="nova-right">Total</th>
                <th className="nova-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Loading pending approvals…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Nothing is waiting on your approval right now.
                  </td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id}>
                    <td className="nova-mono">{i.prNumber ?? '—'}</td>
                    <td>{i.title}</td>
                    <td className="nova-cell-sub">{i.requestedByUserName}</td>
                    <td className="nova-cell-sub">{i.companyName}</td>
                    <td>
                      <span className="nova-pill nova-pill-pending">
                        <span className="nova-dot" />
                        {i.stepOrder} of {i.requiredApprovalStageCount}
                      </span>
                    </td>
                    <td className="nova-right">
                      {i.currency} {i.totalAmount.toFixed(2)}
                    </td>
                    <td className="nova-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(i)}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
