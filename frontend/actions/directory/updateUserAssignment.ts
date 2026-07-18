import { action } from '@/lib/uibakery';

// Updates a user's department/entity assignment and status (used by the Users directory page).
function updateUserAssignment() {
  return action('updateUserAssignment', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE users
      SET department_id = {{params.departmentId}}::bigint,
          entity_id = {{params.entityId}}::bigint,
          status = {{params.status}},
          updated_by = {{params.actorName}},
          updated_at = NOW()
      WHERE id = {{params.id}}::bigint;
    `,
  });
}

export default updateUserAssignment;
