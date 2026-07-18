import { action } from '@/lib/uibakery';

function loadRoleModuleAccess() {
  return action('loadRoleModuleAccess', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT id, role_name, module_key, is_allowed
      FROM role_module_access
      ORDER BY role_name, module_key;
    `,
  });
}

export default loadRoleModuleAccess;
