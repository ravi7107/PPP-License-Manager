import { action } from '@/lib/uibakery';

// Active departments for select dropdowns (software/license/asset forms and filters).
function loadDepartmentOptions() {
  return action('loadDepartmentOptions', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, name, code FROM departments WHERE deleted_at IS NULL ORDER BY name;`,
  });
}

export default loadDepartmentOptions;
