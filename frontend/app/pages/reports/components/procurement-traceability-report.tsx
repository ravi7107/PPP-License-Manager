import { useEffect, useState } from 'react';
import { FileDown, Sheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  getPurchaseRequisitionFulfillmentReport,
  PurchaseRequisitionFulfillmentReportRow,
} from '@/lib/api/purchase-requisitions.api';
import { exportRowsToExcel, exportRowsToPdf, ReportColumn } from '@/lib/utils/report-export';

const columns: ReportColumn<PurchaseRequisitionFulfillmentReportRow>[] = [
  { key: 'type', header: 'Type' },
  { key: 'itemDescription', header: 'Item' },
  { key: 'prNumber', header: 'PR Number' },
  { key: 'poNumber', header: 'PO Number', format: (v) => (v ? String(v) : '—') },
  { key: 'prApprovedAt', header: 'PR Approved', format: (v) => (v ? String(v).slice(0, 10) : '—') },
  { key: 'purchaseDate', header: 'Purchase Date', format: (v) => (v ? String(v).slice(0, 10) : '—') },
  { key: 'vendor', header: 'Vendor', format: (v) => (v ? String(v) : '—') },
  { key: 'cost', header: 'Cost', format: (v) => (v != null ? Number(v).toFixed(2) : '—') },
  { key: 'requestedByUserName', header: 'Requested By' },
  // Phase 9 - extending this one array extends the on-screen table AND
  // both Excel/PDF exports for free (see this component's own doc
  // comment below).
  { key: 'poDate', header: 'PO Date', format: (v) => (v ? String(v).slice(0, 10) : '—') },
  { key: 'poAmount', header: 'PO Amount', format: (v) => (v != null ? Number(v).toFixed(2) : '—') },
  { key: 'invoiceCount', header: 'Invoices' },
  {
    key: 'totalInvoiceAmount',
    header: 'Total Invoiced',
    format: (v) => (v != null ? Number(v).toFixed(2) : '—'),
  },
  { key: 'reconciliationFlag', header: 'Reconciliation' },
];

// Phase 9 - the actual audit-proof deliverable: at a glance, is this PO
// fully accounted for? See PurchaseRequisitionFulfillmentReportRow's own
// comment (backend) for exactly what each flag means.
function ReconciliationBadge({ flag }: { flag: string }) {
  switch (flag) {
    case 'OK':
      return <Badge>OK</Badge>;
    case 'Amount Mismatch':
      return <Badge variant="destructive">Amount Mismatch</Badge>;
    case 'No Invoice':
      return <Badge variant="secondary">No Invoice</Badge>;
    case 'No PO':
    default:
      return <Badge variant="outline">No PO</Badge>;
  }
}

// Which hardware/license purchases were made against which PR/PO, and
// when - closes the audit gap this whole traceability feature exists for.
// Unlike the rest of this Reports module (which still runs the legacy
// UI Bakery SQL datasource - see loadSoftwareUtilizationReport.ts and its
// siblings under actions/reports/), this pulls live from the current
// ASP.NET API, since the PR-link columns only exist in that schema.
export function ProcurementTraceabilityReport() {
  const [rows, setRows] = useState<PurchaseRequisitionFulfillmentReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getPurchaseRequisitionFulfillmentReport()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ??
              'Failed to load the procurement traceability report.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const assetCount = rows.filter((r) => r.type === 'Asset').length;
  const licenseCount = rows.filter((r) => r.type === 'License').length;
  // Phase 9 - reconciliation summary badges, alongside the existing
  // count badges below.
  const noPoCount = rows.filter((r) => r.reconciliationFlag === 'No PO').length;
  const noInvoiceCount = rows.filter((r) => r.reconciliationFlag === 'No Invoice').length;
  const amountMismatchCount = rows.filter(
    (r) => r.reconciliationFlag === 'Amount Mismatch'
  ).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Procurement Traceability Report</CardTitle>
          <CardDescription>
            Every hardware asset and software license purchase linked back to the Purchase
            Requisition it was bought against.
          </CardDescription>
        </div>
        {!loading && rows.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportRowsToExcel(rows, columns, 'procurement-traceability-report.xlsx')
              }
            >
              <Sheet className="mr-1.5 h-3.5 w-3.5" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportRowsToPdf(
                  'Procurement Traceability Report',
                  rows,
                  columns,
                  'procurement-traceability-report.pdf'
                )
              }
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!loading && rows.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">{rows.length} record(s)</Badge>
            <Badge variant="outline">{assetCount} asset(s)</Badge>
            <Badge variant="outline">{licenseCount} license purchase(s)</Badge>
            {noPoCount > 0 && <Badge variant="outline">{noPoCount} no PO</Badge>}
            {noInvoiceCount > 0 && (
              <Badge variant="secondary">{noInvoiceCount} no invoice</Badge>
            )}
            {amountMismatchCount > 0 && (
              <Badge variant="destructive">{amountMismatchCount} amount mismatch</Badge>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>PR Number</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>PR Approved</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>PO Date</TableHead>
                <TableHead className="text-right">PO Amount</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Total Invoiced</TableHead>
                <TableHead>Reconciliation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={14} className="py-8 text-center text-sm text-muted-foreground">
                    Loading procurement traceability report…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="py-8 text-center text-sm text-muted-foreground">
                    No PR-linked assets or license purchases yet. Linking a Purchase Requisition
                    to a new asset or license purchase is optional, so this fills in as that
                    linkage starts being used.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Badge variant="outline">{row.type}</Badge>
                    </TableCell>
                    <TableCell>{row.itemDescription}</TableCell>
                    <TableCell>{row.prNumber}</TableCell>
                    <TableCell>{row.poNumber ?? '—'}</TableCell>
                    <TableCell>
                      {row.prApprovedAt ? row.prApprovedAt.slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell>
                      {row.purchaseDate ? row.purchaseDate.slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell>{row.vendor ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {row.cost != null ? row.cost.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell>{row.requestedByUserName}</TableCell>
                    <TableCell>{row.poDate ? row.poDate.slice(0, 10) : '—'}</TableCell>
                    <TableCell className="text-right">
                      {row.poAmount != null ? row.poAmount.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="text-right">{row.invoiceCount}</TableCell>
                    <TableCell className="text-right">
                      {row.totalInvoiceAmount != null
                        ? row.totalInvoiceAmount.toFixed(2)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <ReconciliationBadge flag={row.reconciliationFlag} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
