import { action } from '@/lib/uibakery';

// Closes out any current active allocation row for the asset and inserts a new Active allocation row
// for the new target. Used for both "Allocate" (first assignment) and "Transfer" (reassignment) so the
// asset always has a single current allocation row plus full history in asset_allocations.
function recordAssetAllocation() {
  return action('recordAssetAllocation', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH closed AS (
        UPDATE asset_allocations
        SET status = 'Released', return_date = CURRENT_DATE, updated_by = {{params.actorName}}, updated_at = NOW()
        WHERE asset_id = {{params.assetId}}::bigint AND status = 'Active' AND deleted_at IS NULL
        RETURNING id
      )
      INSERT INTO asset_allocations (
        asset_id, user_id, department_id, entity_id, client_id, allocation_type, action_type,
        allocation_date, status, notes, created_by, updated_by
      )
      VALUES (
        {{params.assetId}}::bigint,
        {{params.userId}}::bigint,
        {{params.departmentId}}::bigint,
        {{params.entityId}}::bigint,
        {{params.clientId}}::bigint,
        {{params.allocationType}},
        {{params.actionType}},
        CURRENT_DATE,
        'Active',
        {{params.notes}},
        {{params.actorName}},
        {{params.actorName}}
      )
      RETURNING id;
    `,
  });
}

export default recordAssetAllocation;
