import { action } from '@/lib/uibakery';

// Software allocation trend over the last 12 months: new seat allocations per month
// and cumulative active allocations, showing adoption/growth trajectory.
function loadSoftwareAllocationTrends() {
  return action('loadSoftwareAllocationTrends', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH months AS (
        SELECT date_trunc('month', CURRENT_DATE) - (n || ' months')::interval AS month_start
        FROM generate_series(0, 11) AS n
      ),
      new_alloc AS (
        SELECT date_trunc('month', allocation_date) AS month_start, COUNT(*) AS new_allocations
        FROM license_allocations
        WHERE deleted_at IS NULL
        GROUP BY 1
      ),
      cumulative AS (
        SELECT
          m.month_start,
          (
            SELECT COUNT(*) FROM license_allocations la
            WHERE la.deleted_at IS NULL
              AND la.allocation_date <= (m.month_start + INTERVAL '1 month' - INTERVAL '1 day')
              AND (la.release_date IS NULL OR la.release_date > (m.month_start + INTERVAL '1 month' - INTERVAL '1 day'))
          ) AS active_allocations
        FROM months m
      )
      SELECT
        TO_CHAR(m.month_start, 'Mon YYYY') AS month_label,
        COALESCE(new_alloc.new_allocations, 0) AS new_allocations,
        COALESCE(cumulative.active_allocations, 0) AS active_allocations
      FROM months m
      LEFT JOIN new_alloc ON new_alloc.month_start = m.month_start
      LEFT JOIN cumulative ON cumulative.month_start = m.month_start
      ORDER BY m.month_start ASC;
    `,
  });
}

export default loadSoftwareAllocationTrends;
