import { useLoadAction } from '@/lib/uibakery';
import { Badge } from '@/components/ui/badge';
import { ReportTableCard } from '@/app/pages/reports/components/report-table-card';
import loadLicenseExpiryReport from '@/actions/reports/loadLicenseExpiryReport';
import { LicenseExpiryRow } from '@/app/pages/reports/types';
import { ReportColumn } from '@/lib/utils/report-export';

function statusBadge(status: LicenseExpiryRow['expiry_status']) {
  const variant = status === 'Expired' ? 'destructive' : status === 'Expiring Soon' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
}

const columns: ReportColumn<LicenseExpiryRow>[] = [
  { key: 'software_name', header: 'Software' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'total_seats', header: 'Seats' },
  { key: 'expiry_date', header: 'Expiry Date', format: (v) => (v ? String(v) : '—') },
  { key: 'renewal_date', header: 'Renewal Date', format: (v) => (v ? String(v) : '—') },
  { key: 'days_to_expiry', header: 'Days to Expiry', format: (v) => (v === null ? '—' : String(v)) },
  { key: 'expiry_status', header: 'Status' },
  { key: 'entity_name', header: 'Entity' },
  { key: 'client_name', header: 'Client' },
];

export function LicenseExpiryReport() {
  const [rows, loading]: [LicenseExpiryRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadLicenseExpiryReport,
    [],
    {},
  );

  return (
    <ReportTableCard
      title="License Expiry Report"
      description="License pools nearing or past expiry, sorted by nearest expiry date."
      rows={rows}
      columns={columns}
      loading={loading}
      fileBaseName="license-expiry-report"
      render={(row, col) =>
        col.key === 'expiry_status'
          ? statusBadge(row.expiry_status)
          : col.format
            ? col.format(row[col.key], row)
            : String(row[col.key] ?? '—')
      }
    />
  );
}
