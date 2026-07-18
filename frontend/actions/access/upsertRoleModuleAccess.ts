import { action } from '@/lib/uibakery';

// Toggles a single role/module cell. Uses upsert so newly-added modules/roles
// do not require a migration before they can be granted.
function upsertRoleModuleAccess() {
  return action('upsertRoleModuleAccess', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO role_module_access (role_name, module_key, is_allowed, created_by, updated_by)
      VALUES ({{params.roleName}}, {{params.moduleKey}}, {{params.isAllowed}}::boolean, {{params.actorName}}, {{params.actorName}})
      ON CONFLICT (role_name, module_key)
      DO UPDATE SET is_allowed = EXCLUDED.is_allowed, updated_by = EXCLUDED.updated_by, updated_at = NOW();
    `,
  });
}

export default upsertRoleModuleAccess;
