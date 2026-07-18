import { action } from '@/lib/uibakery';

function deleteDepartment() {
  return action('deleteDepartment', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `UPDATE departments SET deleted_at = NOW(), updated_by = {{params.actorName}} WHERE id = {{params.id}}::bigint;`,
  });
}

export default deleteDepartment;
