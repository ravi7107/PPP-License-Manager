import { action } from '@/lib/uibakery';

// License Expiry report: license pools expiring or up for renewal soon (or already expired),
// sorted by nearest expiry date first.
function loadLicenseExpiryReport() {
  return action('loadLicenseExpiryReport', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        li.id,
        s.name AS software_name,
        s.vendor,
        li.total_seats,
        li.expiry_date,
        li.renewal_date,
        li.maintenance_expiry,
        (li.expiry_date - CURRENT_DATE) AS days_to_expiry,
        CASE
          WHEN li.expiry_date IS NULL THEN 'No Expiry Set'
          WHEN li.expiry_date < CURRENT_DATE THEN 'Expired'
          WHEN li.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
          ELSE 'Active'
        END AS expiry_status,
        e.name AS entity_name,
        c.name AS client_name,
        li.status
      FROM license_inventory li
      JOIN software s ON s.id = li.software_id
      LEFT JOIN entities e ON e.id = li.entity_id
      LEFT JOIN clients c ON c.id = li.client_id
      WHERE li.deleted_at IS NULL
      ORDER BY li.expiry_date ASC NULLS LAST;
    `,
  });
}

export default loadLicenseExpiryReport;
