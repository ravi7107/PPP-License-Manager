import { action } from '@/lib/uibakery';

// Global search: matches departments by name or code. Returns counts of users and assets.
function searchDepartments() {
  return action('searchDepartments', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        d.id,
        d.name,
        d.code,
        d.description,
        d.status,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.deleted_at IS NULL) AS user_count,
        (SELECT COUNT(*) FROM assets a WHERE a.department_id = d.id AND a.deleted_at IS NULL) AS asset_count
      FROM departments d
      WHERE d.deleted_at IS NULL
        AND (d.name ILIKE {{params.q}} OR d.code ILIKE {{params.q}})
      ORDER BY d.name
      LIMIT 25;
    `,
  });
}

export default searchDepartments;
