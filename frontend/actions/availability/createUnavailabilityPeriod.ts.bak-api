import { action } from '@/lib/uibakery';

// Team Leader marks a user unavailable for a date range. Any prior Active period for the same
// user is cancelled in the same statement (CTE) so only one active window exists at a time.
// This does NOT touch assets/license_allocations - resources are only computed as "available"
// for display via loadAvailableResources, never auto-reassigned.
function createUnavailabilityPeriod() {
  return action('createUnavailabilityPeriod', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH cancel_prior AS (
        UPDATE user_unavailability_periods
        SET status = 'Cancelled', updated_by = {{params.actorName}}, updated_at = NOW()
        WHERE user_id = {{params.userId}}::bigint AND status = 'Active' AND deleted_at IS NULL
        RETURNING id
      )
      INSERT INTO user_unavailability_periods (user_id, start_date, end_date, reason, status, created_by, updated_by)
      VALUES (
        {{params.userId}}::bigint,
        {{params.startDate}}::date,
        {{params.endDate}}::date,
        {{params.reason}},
        'Active',
        {{params.actorName}},
        {{params.actorName}}
      )
      RETURNING id;
    `,
  });
}

export default createUnavailabilityPeriod;
