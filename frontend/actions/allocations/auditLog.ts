import { action } from '@/lib/uibakery';

export function recordAllocationAudit() {
  return action('recordAllocationAudit', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_values, new_values, created_by)
      VALUES (
        'license_allocations',
        {{params.recordId}}::bigint,
        {{params.action}},
        NULL,
        {{params.oldValues}}::jsonb,
        {{params.newValues}}::jsonb,
        {{params.actorName}}
      );
    `,
  });
}

export function loadAllocationAuditHistory() {
  return action('loadAllocationAuditHistory', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT id, table_name, record_id, action, changed_at, old_values, new_values, created_by
      FROM audit_logs
      WHERE table_name = 'license_allocations' AND record_id = {{params.recordId}}::bigint
      ORDER BY changed_at DESC;
    `,
  });
}

export default recordAllocationAudit;
