import { action } from '@/lib/uibakery';

function loadComputersForRequests() {
  return action('loadComputersForRequests', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT id, COALESCE(computer_name, asset_tag) AS name, asset_tag
      FROM assets
      WHERE deleted_at IS NULL
      ORDER BY computer_name NULLS LAST, asset_tag;
    `,
  });
}

export default loadComputersForRequests;
