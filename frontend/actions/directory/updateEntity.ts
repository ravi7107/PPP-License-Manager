import { action } from '@/lib/uibakery';

function updateEntity() {
  return action('updateEntity', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE entities
      SET name = {{params.name}}, code = {{params.code}}, address = {{params.address}},
          status = {{params.status}}, updated_by = {{params.actorName}}, updated_at = NOW()
      WHERE id = {{params.id}}::bigint;
    `,
  });
}

export default updateEntity;
