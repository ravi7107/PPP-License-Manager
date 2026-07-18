import { action } from '@/lib/uibakery';

// Audit Report: recent audit_logs entries across all tracked tables, most recent first.
function loadAuditReport() {
  return action('loadAuditReport', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        al.id,
        al.table_name,
        al.record_id,
        al.action,
        al.created_by,
        al.changed_at,
        al.old_values,
        al.new_values
      FROM audit_logs al
      ORDER BY al.changed_at DESC
      LIMIT 500;
    `,
  });
}

export default loadAuditReport;
