import { action } from '@/lib/uibakery';

// Releases a license allocation. If releaseDate is today or in the past, the seat is freed
// immediately (status -> Released). If in the future, it stays Active but with a scheduled
// release_date recorded; a scheduler/report can surface upcoming releases.
function releaseAllocation() {
  return action('releaseAllocation', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE license_allocations
      SET
        release_date = {{params.releaseDate}}::date,
        status = CASE WHEN {{params.releaseDate}}::date <= CURRENT_DATE THEN 'Released' ELSE status END,
        notes = COALESCE({{params.notes}}, notes),
        updated_by = {{params.actorName}},
        updated_at = NOW()
      WHERE id = {{params.id}}::bigint;
    `,
  });
}

export default releaseAllocation;
