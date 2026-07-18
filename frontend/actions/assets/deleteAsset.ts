import { action } from '@/lib/uibakery';

// Soft delete: mark record as deleted and inactive instead of removing the row.
function deleteAsset() {
  return action('deleteAsset', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE assets
      SET deleted_at = NOW(), status = 'Decommissioned', updated_by = {{params.actorName}}, updated_at = NOW()
      WHERE id = {{params.id}}::bigint;
    `,
  });
}

export default deleteAsset;
