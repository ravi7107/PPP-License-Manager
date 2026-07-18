import { action } from '@/lib/uibakery';

function deleteEntity() {
  return action('deleteEntity', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `UPDATE entities SET deleted_at = NOW(), updated_by = {{params.actorName}} WHERE id = {{params.id}}::bigint;`,
  });
}

export default deleteEntity;
