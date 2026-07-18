import { action } from '@/lib/uibakery';

export function loadUsers() {
  return action('loadUsersForAssets', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, full_name FROM users WHERE deleted_at IS NULL ORDER BY full_name;`,
  });
}

export function loadDepartments() {
  return action('loadDepartmentsForAssets', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, name FROM departments WHERE deleted_at IS NULL ORDER BY name;`,
  });
}

export function loadEntities() {
  return action('loadEntitiesForAssets', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, name FROM entities WHERE deleted_at IS NULL ORDER BY name;`,
  });
}

export function loadClients() {
  return action('loadClientsForAssets', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, name FROM clients WHERE deleted_at IS NULL ORDER BY name;`,
  });
}
