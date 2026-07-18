import { action } from '@/lib/uibakery';

// Closes the current active allocation row for the asset (Return Hardware): marks it Released and
// records a Return history row so the return event itself is auditable.
function returnAssetAllocation() {
  return action('returnAssetAllocation', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH closed AS (
        UPDATE asset_allocations
        SET status = 'Released', return_date = CURRENT_DATE, updated_by = {{params.actorName}}, updated_at = NOW()
        WHERE asset_id = {{params.assetId}}::bigint AND status = 'Active' AND deleted_at IS NULL
        RETURNING asset_id, user_id, department_id, entity_id, client_id, allocation_type
      )
      INSERT INTO asset_allocations (
        asset_id, user_id, department_id, entity_id, client_id, allocation_type, action_type,
        allocation_date, return_date, status, notes, created_by, updated_by
      )
      SELECT asset_id, user_id, department_id, entity_id, client_id, allocation_type, 'Return',
        CURRENT_DATE, CURRENT_DATE, 'Released', {{params.notes}}, {{params.actorName}}, {{params.actorName}}
      FROM closed
      RETURNING id;
    `,
  });
}

export default returnAssetAllocation;
