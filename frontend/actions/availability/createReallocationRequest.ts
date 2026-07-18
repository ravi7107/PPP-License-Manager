import { action } from '@/lib/uibakery';

// Team Leader requests reallocation of a resource that is temporarily available (its owner is
// unavailable). This only creates a Pending request - no assignment changes happen until an
// IT Administrator approves it via decideReallocationRequest.
function createReallocationRequest() {
  return action('createReallocationRequest', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO reallocation_requests (
        unavailability_id, resource_type, asset_id, license_allocation_id, target_user_id,
        requested_by, justification, status, created_by, updated_by
      )
      VALUES (
        {{params.unavailabilityId}}::bigint,
        {{params.resourceType}},
        {{params.assetId}}::bigint,
        {{params.licenseAllocationId}}::bigint,
        {{params.targetUserId}}::bigint,
        {{params.actorName}},
        {{params.justification}},
        'Pending',
        {{params.actorName}},
        {{params.actorName}}
      )
      RETURNING id;
    `,
  });
}

export default createReallocationRequest;
