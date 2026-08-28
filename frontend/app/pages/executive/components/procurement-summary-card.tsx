import { Receipt, FileCheck2, Scale, FileWarning, AlertTriangle, Clock, Hourglass } from 'lucide-react';
import { KpiCard } from '@/components/layout/kpi-card';
import { ProcurementSummaryRow } from '@/app/pages/executive/types';

// Phase 10 - Pillar 4 (Procurement). Mirrors ExecutiveKpiCards' tile shape
// (same grid, same KpiCard component) rather than inventing a new one -
// this is the actual audit-proof deliverable the business owner asked
// for, surfaced at the executive level: is procurement spend fully
// reconciled against invoices, and how fast is that reconciliation
// happening.
export function ProcurementSummaryCard({
  summary,
}: {
  summary: ProcurementSummaryRow | undefined;
}) {
  const totalPoValue = Number(summary?.total_po_value ?? 0);
  const totalInvoicedValue = Number(summary?.total_invoiced_value ?? 0);
  const variance = Number(summary?.variance ?? 0);
  const prsWithNoPo = Number(summary?.prs_with_no_po ?? 0);
  const posWithNoInvoice = Number(summary?.pos_with_no_invoice ?? 0);
  const avgApprovalToPo = summary?.avg_days_approval_to_po_upload ?? null;
  const avgPoToInvoice = summary?.avg_days_po_to_first_invoice ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total PO Value"
        value={`₹${totalPoValue.toLocaleString('en-IN')}`}
        icon={Receipt}
        hint="Approved PRs with a PO on file"
      />
      <KpiCard
        title="Total Invoiced"
        value={`₹${totalInvoicedValue.toLocaleString('en-IN')}`}
        icon={FileCheck2}
        hint="Sum of all uploaded invoices"
      />
      <KpiCard
        title="PO / Invoice Variance"
        value={`₹${Math.abs(variance).toLocaleString('en-IN')}`}
        icon={Scale}
        hint={variance === 0 ? 'Fully reconciled' : variance > 0 ? 'Not yet invoiced' : 'Invoiced over PO amount'}
        tone={variance === 0 ? 'success' : 'warning'}
      />
      <KpiCard
        title="PRs Missing a PO"
        value={prsWithNoPo}
        icon={FileWarning}
        hint="Approved, no PO number recorded"
        tone={prsWithNoPo > 0 ? 'warning' : 'success'}
      />
      <KpiCard
        title="POs Missing an Invoice"
        value={posWithNoInvoice}
        icon={AlertTriangle}
        hint="PO on file, nothing invoiced yet"
        tone={posWithNoInvoice > 0 ? 'danger' : 'success'}
      />
      <KpiCard
        title="Avg. Approval → PO Upload"
        value={avgApprovalToPo != null ? avgApprovalToPo : '—'}
        suffix={avgApprovalToPo != null ? 'days' : undefined}
        icon={Clock}
        hint="How fast Finance turns around a PO"
        animate={false}
      />
      <KpiCard
        title="Avg. PO → First Invoice"
        value={avgPoToInvoice != null ? avgPoToInvoice : '—'}
        suffix={avgPoToInvoice != null ? 'days' : undefined}
        icon={Hourglass}
        hint="How fast billing follows a PO"
        animate={false}
      />
    </div>
  );
}
