import { action } from '@/lib/uibakery';

// IT Administrator approves or rejects a reallocation request. On approval, performs the actual
// reallocation: reassigns the asset's assigned_user_id, or transfers the license_allocation's
// user_id, to the requested target user. Rejection only updates the request status.
function decideReallocationRequest() {
  return action('decideReallocationRequest', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH decided AS (
        UPDATE reallocation_requests
        SET
          status = {{params.decision}},
          decided_by = {{params.actorName}},
          decided_at = NOW(),
          decision_notes = {{params.decisionNotes}},
          updated_by = {{params.actorName}},
          updated_at = NOW()
        WHERE id = {{params.id}}::bigint
        RETURNING id, resource_type, asset_id, license_allocation_id, target_user_id, status
      ),
      apply_asset AS (
        UPDATE assets
        SET assigned_user_id = decided.target_user_id, updated_by = {{params.actorName}}, updated_at = NOW()
        FROM decided
        WHERE assets.id = decided.asset_id
          AND decided.resource_type = 'Asset'
          AND decided.status = 'Approved'
        RETURNING assets.id
      ),
      apply_license AS (
        UPDATE license_allocations
        SET user_id = decided.target_user_id, updated_by = {{params.actorName}}, updated_at = NOW()
        FROM decided
        WHERE license_allocations.id = decided.license_allocation_id
          AND decided.resource_type = 'License'
          AND decided.status = 'Approved'
        RETURNING license_allocations.id
      )
      SELECT id FROM decided;
    `,
  });
}

export default decideReallocationRequest;
