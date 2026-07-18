import { useLoadAction } from '@/lib/uibakery';
import { ReportTableCard } from '@/app/pages/reports/components/report-table-card';
import loadSoftwareCostReport from '@/actions/reports/loadSoftwareCostReport';
import { SoftwareCostRow } from '@/app/pages/reports/types';
import { ReportColumn } from '@/lib/utils/report-export';

const columns: ReportColumn<SoftwareCostRow>[] = [
  { key: 'software_name', header: 'Software' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'pool_count', header: 'License Pools' },
  { key: 'total_seats', header: 'Total Seats' },
  { key: 'used_seats', header: 'Used Seats' },
  { key: 'cost_per_seat', header: 'Cost / Seat', format: (v) => `$${Number(v).toLocaleString()}` },
  { key: 'total_cost', header: 'Total Cost', format: (v) => `$${Number(v).toLocaleString()}` },
];

export function SoftwareCostReport() {
  const [rows, loading]: [SoftwareCostRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadSoftwareCostReport,
    [],
    {},
  );

  return (
    <ReportTableCard
      title="Software Cost Report"
      description="Total license spend per software title, with seat usage and cost per seat."
      rows={rows}
      columns={columns}
      loading={loading}
      fileBaseName="software-cost-report"
    />
  );
}
