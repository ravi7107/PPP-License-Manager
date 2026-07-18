import { action } from '@/lib/uibakery';

// Lists all unavailability periods with computed effective status:
// Active + within date range => "Active", Active + future start => "Upcoming",
// Active + end_date passed => "Ended" (display only; a separate action flips stored status).
function loadUnavailabilityPeriods() {
  return action('loadUnavailabilityPeriods', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        uup.id,
        uup.user_id,
        u.full_name AS user_name,
        u.department_id,
        d.name AS department_name,
        uup.start_date,
        uup.end_date,
        uup.reason,
        uup.status,
        CASE
          WHEN uup.status = 'Cancelled' THEN 'Cancelled'
          WHEN uup.status = 'Active' AND CURRENT_DATE < uup.start_date THEN 'Upcoming'
          WHEN uup.status = 'Active' AND CURRENT_DATE > uup.end_date THEN 'Ended'
          WHEN uup.status = 'Active' THEN 'Active'
          ELSE uup.status
        END AS effective_status,
        uup.created_at,
        uup.updated_at,
        uup.created_by,
        uup.updated_by
      FROM user_unavailability_periods uup
      JOIN users u ON u.id = uup.user_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE uup.deleted_at IS NULL
      ORDER BY uup.start_date DESC;
    `,
  });
}

export default loadUnavailabilityPeriods;
