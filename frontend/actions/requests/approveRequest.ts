import { action } from '@/lib/uibakery';

// IT Administrator approves a Pending request: records the decision, marks the request Approved,
// and - only for New License / Reallocation requests with a resolvable license pool - creates the
// matching license_allocations row (subject to seat capacity). Release requests only update status;
// actual release is performed via the Allocations module (out of scope for auto-apply here).
function approveRequest() {
  return action('approveRequest', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH req AS (
        SELECT * FROM requests WHERE id = {{params.requestId}}::bigint AND status = 'Pending' AND deleted_at IS NULL
      ),
      capacity AS (
        SELECT li.id, li.total_seats,
          (SELECT COUNT(*) FROM license_allocations WHERE license_inventory_id = li.id AND deleted_at IS NULL AND status = 'Active') AS used_seats
        FROM license_inventory li
        JOIN req ON req.license_inventory_id = li.id
      ),
      updated_request AS (
        UPDATE requests r
        SET status = 'Approved', updated_by = {{params.actorName}}, updated_at = NOW()
        FROM req
        WHERE r.id = req.id
        RETURNING r.*
      ),
      new_allocation AS (
        INSERT INTO license_allocations (
          license_inventory_id, allocation_type, user_id, asset_id, entity_id, client_id,
          allocation_date, is_temporary, status, notes, created_by, updated_by
        )
        SELECT
          req.license_inventory_id, req.allocation_type, req.target_user_id, req.asset_id, req.entity_id, req.client_id,
          CURRENT_DATE, FALSE, 'Active', {{params.comment}}, {{params.actorName}}, {{params.actorName}}
        FROM req, updated_request
        WHERE req.request_type IN ('New License', 'Reallocation')
          AND req.license_inventory_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM capacity WHERE capacity.used_seats < capacity.total_seats)
        RETURNING id
      ),
      upsert_approval AS (
        INSERT INTO approvals (request_id, approver_id, approver_name, decision, comment, decided_at, status, created_by, updated_by)
        SELECT req.id, NULL, {{params.actorName}}, 'Approved', {{params.comment}}, NOW(), 'Approved', {{params.actorName}}, {{params.actorName}}
        FROM req
        RETURNING id
      )
      SELECT
        (SELECT id FROM updated_request) AS request_id,
        (SELECT id FROM new_allocation) AS allocation_id,
        (SELECT id FROM upsert_approval) AS approval_id,
        (SELECT req.license_inventory_id IS NOT NULL AND req.request_type IN ('New License','Reallocation')
           AND NOT EXISTS (SELECT 1 FROM capacity WHERE capacity.used_seats < capacity.total_seats) FROM req) AS capacity_exceeded;
    `,
  });
}

export default approveRequest;
