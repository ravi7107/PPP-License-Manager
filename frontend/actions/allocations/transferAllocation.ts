import { action } from '@/lib/uibakery';

// Transfers an existing allocation to a different user/computer/entity/client without changing
// the license pool's seat count (in-place update). Caller should also write an audit log entry
// capturing before/after values.
function transferAllocation() {
  return action('transferAllocation', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE license_allocations
      SET
        allocation_type = {{params.allocationType}},
        user_id = {{params.userId}}::bigint,
        asset_id = {{params.assetId}}::bigint,
        entity_id = {{params.entityId}}::bigint,
        client_id = {{params.clientId}}::bigint,
        notes = {{params.notes}},
        updated_by = {{params.actorName}},
        updated_at = NOW()
      WHERE id = {{params.id}}::bigint;
    `,
  });
}

export default transferAllocation;
