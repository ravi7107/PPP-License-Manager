import { action } from '@/lib/uibakery';

// Creates a new department on the fly (e.g. PTech, EC, AEC or any custom department name).
export function createDepartment() {
  return action('createDepartment', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO departments (name, code, created_by, updated_by)
      VALUES ({{params.name}}, {{params.code}}, {{params.actorName}}, {{params.actorName}})
      ON CONFLICT (code) DO NOTHING
      RETURNING id;
    `,
  });
}

// Creates a new client used for client-wise license/asset allocation.
export function createClient() {
  return action('createClient', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO clients (name, code, created_by, updated_by)
      VALUES ({{params.name}}, {{params.code}}, {{params.actorName}}, {{params.actorName}})
      ON CONFLICT (code) DO NOTHING
      RETURNING id;
    `,
  });
}

// Creates a new business entity.
export function createEntity() {
  return action('createEntity', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO entities (name, code, created_by, updated_by)
      VALUES ({{params.name}}, {{params.code}}, {{params.actorName}}, {{params.actorName}})
      ON CONFLICT (code) DO NOTHING
      RETURNING id;
    `,
  });
}
