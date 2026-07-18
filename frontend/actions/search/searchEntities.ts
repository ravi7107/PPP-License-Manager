import { action } from '@/lib/uibakery';

// Global search: matches entities by name or code. Returns counts of assets, license pools, and users.
function searchEntities() {
  return action('searchEntities', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        e.id,
        e.name,
        e.code,
        e.address,
        e.status,
        (SELECT COUNT(*) FROM assets a WHERE a.entity_id = e.id AND a.deleted_at IS NULL) AS asset_count,
        (SELECT COUNT(*) FROM license_inventory li WHERE li.entity_id = e.id AND li.deleted_at IS NULL) AS license_pool_count,
        (SELECT COUNT(*) FROM users u WHERE u.entity_id = e.id AND u.deleted_at IS NULL) AS user_count
      FROM entities e
      WHERE e.deleted_at IS NULL
        AND (e.name ILIKE {{params.q}} OR e.code ILIKE {{params.q}})
      ORDER BY e.name
      LIMIT 25;
    `,
  });
}

export default searchEntities;
