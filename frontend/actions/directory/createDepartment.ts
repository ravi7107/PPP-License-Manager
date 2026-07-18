import { action } from '@/lib/uibakery';

function createDepartment() {
  return action('createDepartment', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO departments (name, code, description, status, created_by, updated_by)
      VALUES ({{params.name}}, {{params.code}}, {{params.description}}, {{params.status}}, {{params.actorName}}, {{params.actorName}});
    `,
  });
}

export default createDepartment;
