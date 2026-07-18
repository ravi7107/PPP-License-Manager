import { action } from '@/lib/uibakery';

// Executive KPI summary: total software investment, seat utilization, unused license cost,
// and upcoming renewal counts (30/90 day windows).
function loadInvestmentSummary() {
  return action('loadInvestmentSummary', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH used AS (
        SELECT license_inventory_id, COUNT(*) AS used_licenses
        FROM license_allocations
        WHERE deleted_at IS NULL AND status = 'Active'
        GROUP BY license_inventory_id
      )
      SELECT
        COALESCE(SUM(li.cost), 0) AS total_investment,
        COALESCE(SUM(li.total_seats), 0) AS total_seats,
        COALESCE(SUM(u.used_licenses), 0) AS used_seats,
        CASE WHEN COALESCE(SUM(li.total_seats), 0) > 0
          THEN ROUND(COALESCE(SUM(u.used_licenses), 0)::numeric / SUM(li.total_seats) * 100, 1)
          ELSE 0
        END AS utilization_pct,
        COALESCE(SUM(
          CASE WHEN li.total_seats > 0
            THEN (li.total_seats - COALESCE(u.used_licenses, 0))::numeric / li.total_seats * COALESCE(li.cost, 0)
            ELSE 0
          END
        ), 0) AS unused_cost,
        COUNT(DISTINCT li.software_id) AS active_software_count,
        COUNT(*) FILTER (WHERE li.expiry_date IS NOT NULL AND li.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS renewals_30d,
        COUNT(*) FILTER (WHERE li.expiry_date IS NOT NULL AND li.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days') AS renewals_90d
      FROM license_inventory li
      LEFT JOIN used u ON u.license_inventory_id = li.id
      WHERE li.deleted_at IS NULL;
    `,
  });
}

export default loadInvestmentSummary;
