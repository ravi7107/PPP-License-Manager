import { action } from '@/lib/uibakery';

function loadEntitiesFull() {
  return action('loadEntitiesFull', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT e.id, e.name, e.code, e.address, e.status,
        (SELECT COUNT(*) FROM assets a WHERE a.entity_id = e.id AND a.deleted_at IS NULL) AS asset_count
      FROM entities e
      WHERE e.deleted_at IS NULL
      ORDER BY e.name;
    `,
  });
}

export default loadEntitiesFull;
