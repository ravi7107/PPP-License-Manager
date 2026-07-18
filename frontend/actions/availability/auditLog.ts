import { action } from '@/lib/uibakery';

export function recordAvailabilityAudit() {
  return action('recordAvailabilityAudit', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_values, new_values, created_by)
      VALUES (
        {{params.tableName}},
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

export function loadAvailabilityAuditHistory() {
  return action('loadAvailabilityAuditHistory', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT id, table_name, record_id, action, changed_at, old_values, new_values, created_by
      FROM audit_logs
      WHERE table_name IN ('user_unavailability_periods', 'reallocation_requests') AND record_id = {{params.recordId}}::bigint
      ORDER BY changed_at DESC;
    `,
  });
}

export default recordAvailabilityAudit;
