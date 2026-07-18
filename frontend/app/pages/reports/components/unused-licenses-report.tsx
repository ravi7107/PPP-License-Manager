import { useLoadAction } from '@/lib/uibakery';
import { ReportTableCard } from '@/app/pages/reports/components/report-table-card';
import loadUnusedLicensesReport from '@/actions/reports/loadUnusedLicensesReport';
import { UnusedLicenseRow } from '@/app/pages/reports/types';
import { ReportColumn } from '@/lib/utils/report-export';

const columns: ReportColumn<UnusedLicenseRow>[] = [
  { key: 'software_name', header: 'Software' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'total_seats', header: 'Total Seats' },
  { key: 'used_seats', header: 'Used Seats' },
  { key: 'unused_seats', header: 'Unused Seats' },
  { key: 'wasted_cost', header: 'Wasted Cost', format: (v) => `$${Number(v).toLocaleString()}` },
  { key: 'entity_name', header: 'Entity' },
  { key: 'client_name', header: 'Client' },
  { key: 'status', header: 'Status' },
];

export function UnusedLicensesReport() {
  const [rows, loading]: [UnusedLicenseRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadUnusedLicensesReport,
    [],
    {},
  );

  return (
    <ReportTableCard
      title="Unused Licenses Report"
      description="License pools with unused seats, highlighting potential wasted spend."
      rows={rows}
      columns={columns}
      loading={loading}
      fileBaseName="unused-licenses-report"
    />
  );
}
