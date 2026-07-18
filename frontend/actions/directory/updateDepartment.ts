import { action } from '@/lib/uibakery';

function updateDepartment() {
  return action('updateDepartment', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE departments
      SET name = {{params.name}}, code = {{params.code}}, description = {{params.description}},
          status = {{params.status}}, updated_by = {{params.actorName}}, updated_at = NOW()
      WHERE id = {{params.id}}::bigint;
    `,
  });
}

export default updateDepartment;
