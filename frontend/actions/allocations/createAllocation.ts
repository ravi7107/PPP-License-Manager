import { action } from '@/lib/uibakery';

// Allocates a license seat to a user, a computer/asset, an entity, or a client.
// Guards against over-allocation by only inserting if seats are still available in the pool.
function createAllocation() {
  return action('createAllocation', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH capacity AS (
        SELECT
          li.id,
          li.total_seats,
          (SELECT COUNT(*) FROM license_allocations WHERE license_inventory_id = li.id AND deleted_at IS NULL AND status = 'Active') AS used_seats
        FROM license_inventory li
        WHERE li.id = {{params.licenseInventoryId}}::bigint
      )
      INSERT INTO license_allocations (
        license_inventory_id, allocation_type, user_id, asset_id, entity_id, client_id,
        allocation_date, is_temporary, share_end_date, status, notes, created_by, updated_by
      )
      SELECT
        {{params.licenseInventoryId}}::bigint,
        {{params.allocationType}},
        {{params.userId}}::bigint,
        {{params.assetId}}::bigint,
        {{params.entityId}}::bigint,
        {{params.clientId}}::bigint,
        COALESCE({{params.allocationDate}}::date, CURRENT_DATE),
        {{params.isTemporary}}::boolean,
        {{params.shareEndDate}}::date,
        'Active',
        {{params.notes}},
        {{params.actorName}},
        {{params.actorName}}
      FROM capacity
      WHERE capacity.used_seats < capacity.total_seats
      RETURNING id;
    `,
  });
}

export default createAllocation;
