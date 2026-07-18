import { action } from '@/lib/uibakery';

function createEntity() {
  return action('createEntity', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO entities (name, code, address, status, created_by, updated_by)
      VALUES ({{params.name}}, {{params.code}}, {{params.address}}, {{params.status}}, {{params.actorName}}, {{params.actorName}});
    `,
  });
}

export default createEntity;
