import { action } from '@/lib/uibakery';

// Active clients for select dropdowns (software/license/asset forms and filters).
function loadClientOptions() {
  return action('loadClientOptions', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, name, code FROM clients WHERE deleted_at IS NULL ORDER BY name;`,
  });
}

export default loadClientOptions;
