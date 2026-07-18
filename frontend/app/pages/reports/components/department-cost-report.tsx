import { useLoadAction } from '@/lib/uibakery';
import { ReportTableCard } from '@/app/pages/reports/components/report-table-card';
import loadDepartmentCostReport from '@/actions/reports/loadDepartmentCostReport';
import { DepartmentCostRow } from '@/app/pages/reports/types';
import { ReportColumn } from '@/lib/utils/report-export';

const columns: ReportColumn<DepartmentCostRow>[] = [
  { key: 'department_name', header: 'Department' },
  { key: 'software_titles', header: 'Software Titles' },
  { key: 'total_seats', header: 'Total Seats' },
  { key: 'used_seats', header: 'Used Seats' },
  { key: 'total_cost', header: 'Total Cost', format: (v) => `$${Number(v).toLocaleString()}` },
];

export function DepartmentCostReport() {
  const [rows, loading]: [DepartmentCostRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadDepartmentCostReport,
    [],
    {},
  );

  return (
    <ReportTableCard
      title="Department Cost Report"
      description="Total license spend attributable to each department's license pools."
      rows={rows}
      columns={columns}
      loading={loading}
      fileBaseName="department-cost-report"
    />
  );
}
