import { action } from '@/lib/uibakery';

function loadClientsForRequests() {
  return action('loadClientsForRequests', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, name FROM clients WHERE deleted_at IS NULL ORDER BY name;`,
  });
}

export default loadClientsForRequests;
