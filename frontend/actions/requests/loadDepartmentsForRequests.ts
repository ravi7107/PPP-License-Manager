import { action } from '@/lib/uibakery';

function loadDepartmentsForRequests() {
  return action('loadDepartmentsForRequests', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, name FROM departments WHERE deleted_at IS NULL ORDER BY name;`,
  });
}

export default loadDepartmentsForRequests;
