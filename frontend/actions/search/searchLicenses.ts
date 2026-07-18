import { action } from '@/lib/uibakery';

// Global search: matches license pools via software name/vendor.
// Returns seat capacity/usage and entity/client scope for each pool.
function searchLicenses() {
  return action('searchLicenses', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        li.id,
        s.name AS software_name,
        s.vendor,
        li.total_seats,
        (
          SELECT COUNT(*) FROM license_allocations la
          WHERE la.license_inventory_id = li.id AND la.deleted_at IS NULL AND la.status = 'Active'
        ) AS used_seats,
        li.status,
        li.expiry_date,
        li.renewal_date,
        e.name AS entity_name,
        c.name AS client_name
      FROM license_inventory li
      JOIN software s ON s.id = li.software_id
      LEFT JOIN entities e ON e.id = li.entity_id
      LEFT JOIN clients c ON c.id = li.client_id
      WHERE li.deleted_at IS NULL
        AND (s.name ILIKE {{params.q}} OR s.vendor ILIKE {{params.q}})
      ORDER BY s.name
      LIMIT 25;
    `,
  });
}

export default searchLicenses;
