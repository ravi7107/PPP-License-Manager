import { action } from '@/lib/uibakery';

function loadEntitiesForRequests() {
  return action('loadEntitiesForRequests', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, name FROM entities WHERE deleted_at IS NULL ORDER BY name;`,
  });
}

export default loadEntitiesForRequests;
