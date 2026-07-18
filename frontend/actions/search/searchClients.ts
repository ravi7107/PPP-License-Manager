import { action } from '@/lib/uibakery';

// Global search: matches clients by name or code. Returns counts of assets and license pools.
function searchClients() {
  return action('searchClients', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        c.id,
        c.name,
        c.code,
        c.contact_name,
        c.contact_email,
        c.status,
        (SELECT COUNT(*) FROM assets a WHERE a.client_id = c.id AND a.deleted_at IS NULL) AS asset_count,
        (SELECT COUNT(*) FROM license_inventory li WHERE li.client_id = c.id AND li.deleted_at IS NULL) AS license_pool_count
      FROM clients c
      WHERE c.deleted_at IS NULL
        AND (c.name ILIKE {{params.q}} OR c.code ILIKE {{params.q}})
      ORDER BY c.name
      LIMIT 25;
    `,
  });
}

export default searchClients;
