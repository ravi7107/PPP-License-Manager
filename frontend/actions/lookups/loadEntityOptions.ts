import { action } from '@/lib/uibakery';

// Active entities for select dropdowns (software/license/asset forms and filters).
function loadEntityOptions() {
  return action('loadEntityOptions', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, name, code FROM entities WHERE deleted_at IS NULL ORDER BY name;`,
  });
}

export default loadEntityOptions;
