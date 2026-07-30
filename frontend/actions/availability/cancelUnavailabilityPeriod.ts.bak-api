import { action } from '@/lib/uibakery';

// Ends/cancels an unavailability period early. Once cancelled, the user's assets/licenses
// no longer show up in the temporarily-available pool.
function cancelUnavailabilityPeriod() {
  return action('cancelUnavailabilityPeriod', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE user_unavailability_periods
      SET status = 'Cancelled', updated_by = {{params.actorName}}, updated_at = NOW()
      WHERE id = {{params.id}}::bigint;
    `,
  });
}

export default cancelUnavailabilityPeriod;
