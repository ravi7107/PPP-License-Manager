import { action } from '@/lib/uibakery';

function loadSoftwareOptions() {
  return action('loadSoftwareOptionsForReports', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT DISTINCT s.id, s.name, s.vendor
      FROM software s
      JOIN license_inventory li ON li.software_id = s.id
      WHERE s.deleted_at IS NULL AND li.deleted_at IS NULL
      ORDER BY s.name;
    `,
  });
}

export default loadSoftwareOptions;
