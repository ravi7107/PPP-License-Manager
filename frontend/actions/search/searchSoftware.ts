import { action } from '@/lib/uibakery';

// Global search: matches software by name or vendor.
// Returns license pools (seats/used) and total active installation count.
function searchSoftware() {
  return action('searchSoftware', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        s.id,
        s.name,
        s.vendor,
        s.version,
        s.license_type,
        s.status,
        (
          SELECT COALESCE(SUM(li.total_seats), 0)
          FROM license_inventory li
          WHERE li.software_id = s.id AND li.deleted_at IS NULL
        ) AS total_seats,
        (
          SELECT COUNT(*)
          FROM license_allocations la
          JOIN license_inventory li ON li.id = la.license_inventory_id
          WHERE li.software_id = s.id AND la.deleted_at IS NULL AND la.status = 'Active'
        ) AS used_seats,
        (
          SELECT COUNT(*)
          FROM software_installations si
          WHERE si.software_id = s.id AND si.deleted_at IS NULL AND si.status = 'Active'
        ) AS active_installations
      FROM software s
      WHERE s.deleted_at IS NULL
        AND (s.name ILIKE {{params.q}} OR s.vendor ILIKE {{params.q}})
      ORDER BY s.name
      LIMIT 25;
    `,
  });
}

export default searchSoftware;
