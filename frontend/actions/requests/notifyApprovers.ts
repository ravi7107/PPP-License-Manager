import { action } from '@/lib/uibakery';

// Notifies all IT Administrators / Super Administrators of a newly submitted request.
// Matches users by their `role` column - fires for every active IT/Super Admin user on record.
function notifyApprovers() {
  return action('notifyApprovers', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO notifications (user_id, notification_type, title, message, created_by, updated_by)
      SELECT u.id, {{params.notificationType}}, {{params.title}}, {{params.message}}, {{params.actorName}}, {{params.actorName}}
      FROM users u
      WHERE u.deleted_at IS NULL
        AND u.role IN ('IT Administrator', 'Super Administrator');
    `,
  });
}

export default notifyApprovers;
