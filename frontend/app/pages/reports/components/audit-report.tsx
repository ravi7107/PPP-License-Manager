import { useLoadAction } from '@/lib/uibakery';
import { ReportTableCard } from '@/app/pages/reports/components/report-table-card';
import loadAuditReport from '@/actions/reports/loadAuditReport';
import { AuditReportRow } from '@/app/pages/reports/types';
import { ReportColumn } from '@/lib/utils/report-export';

function stringifyValues(v: unknown): string {
  if (!v) return '—';
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

const columns: ReportColumn<AuditReportRow>[] = [
  { key: 'changed_at', header: 'Timestamp', format: (v) => (v ? new Date(String(v)).toLocaleString() : '—') },
  { key: 'table_name', header: 'Table' },
  { key: 'record_id', header: 'Record ID' },
  { key: 'action', header: 'Action' },
  { key: 'created_by', header: 'By' },
  { key: 'old_values', header: 'Old Values', format: (v) => stringifyValues(v) },
  { key: 'new_values', header: 'New Values', format: (v) => stringifyValues(v) },
];

export function AuditReport() {
  const [rows, loading]: [AuditReportRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadAuditReport,
    [],
    {},
  );

  return (
    <ReportTableCard
      title="Audit Report"
      description="Most recent 500 create/update/delete events across all tracked tables."
      rows={rows}
      columns={columns}
      loading={loading}
      fileBaseName="audit-report"
    />
  );
}
