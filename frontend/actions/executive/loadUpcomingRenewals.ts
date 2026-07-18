import { action } from '@/lib/uibakery';

// Upcoming renewals in the next 90 days (or already expired), nearest first, for executive attention.
function loadUpcomingRenewals() {
  return action('loadUpcomingRenewals', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        li.id,
        s.name AS software_name,
        s.vendor,
        e.name AS entity_name,
        c.name AS client_name,
        li.total_seats,
        li.cost,
        li.renewal_date,
        li.expiry_date,
        (li.expiry_date - CURRENT_DATE) AS days_to_expiry
      FROM license_inventory li
      JOIN software s ON s.id = li.software_id
      LEFT JOIN entities e ON e.id = li.entity_id
      LEFT JOIN clients c ON c.id = li.client_id
      WHERE li.deleted_at IS NULL
        AND li.expiry_date IS NOT NULL
        AND li.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
      ORDER BY li.expiry_date ASC
      LIMIT 10;
    `,
  });
}

export default loadUpcomingRenewals;
