import { action } from '@/lib/uibakery';

// Soft delete: mark license inventory record as retired instead of removing the row.
function deleteSoftwareInventory() {
  return action('deleteSoftwareInventory', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE license_inventory
      SET deleted_at = NOW(), status = 'Retired', updated_by = {{params.actorName}}, updated_at = NOW()
      WHERE id = {{params.id}}::bigint;
    `,
  });
}

export default deleteSoftwareInventory;
