import { action } from '@/lib/uibakery';

// Monthly Summary report: month-by-month counts of new requests, approvals/rejections,
// new license allocations, and new asset assignments over the last 12 months.
function loadMonthlySummaryReport() {
  return action('loadMonthlySummaryReport', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH months AS (
        SELECT date_trunc('month', CURRENT_DATE) - (n || ' months')::interval AS month_start
        FROM generate_series(0, 11) AS n
      ),
      req AS (
        SELECT date_trunc('month', requested_date) AS month_start, COUNT(*) AS request_count
        FROM requests WHERE deleted_at IS NULL GROUP BY 1
      ),
      appr AS (
        SELECT date_trunc('month', decided_at) AS month_start,
          COUNT(*) FILTER (WHERE decision = 'Approved') AS approved_count,
          COUNT(*) FILTER (WHERE decision = 'Rejected') AS rejected_count
        FROM approvals WHERE deleted_at IS NULL GROUP BY 1
      ),
      alloc AS (
        SELECT date_trunc('month', allocation_date) AS month_start, COUNT(*) AS allocation_count
        FROM license_allocations WHERE deleted_at IS NULL GROUP BY 1
      ),
      assets_assigned AS (
        SELECT date_trunc('month', purchase_date) AS month_start, COUNT(*) AS asset_count
        FROM assets WHERE deleted_at IS NULL GROUP BY 1
      )
      SELECT
        TO_CHAR(m.month_start, 'Mon YYYY') AS month_label,
        COALESCE(req.request_count, 0) AS request_count,
        COALESCE(appr.approved_count, 0) AS approved_count,
        COALESCE(appr.rejected_count, 0) AS rejected_count,
        COALESCE(alloc.allocation_count, 0) AS allocation_count,
        COALESCE(assets_assigned.asset_count, 0) AS asset_count
      FROM months m
      LEFT JOIN req ON req.month_start = m.month_start
      LEFT JOIN appr ON appr.month_start = m.month_start
      LEFT JOIN alloc ON alloc.month_start = m.month_start
      LEFT JOIN assets_assigned ON assets_assigned.month_start = m.month_start
      ORDER BY m.month_start ASC;
    `,
  });
}

export default loadMonthlySummaryReport;
