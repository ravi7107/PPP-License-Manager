import { action } from '@/lib/uibakery';

function deleteClient() {
  return action('deleteClient', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `UPDATE clients SET deleted_at = NOW(), updated_by = {{params.actorName}} WHERE id = {{params.id}}::bigint;`,
  });
}

export default deleteClient;
