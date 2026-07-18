import { action } from '@/lib/uibakery';

// Notifies the requester once their request has been decided (Approved/Rejected).
// Skips gracefully (WHERE EXISTS via JOIN) if no user row matches the requester name yet.
function notifyRequester() {
  return action('notifyRequester', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO notifications (user_id, notification_type, title, message, created_by, updated_by)
      SELECT u.id, {{params.notificationType}}, {{params.title}}, {{params.message}}, {{params.actorName}}, {{params.actorName}}
      FROM users u
      WHERE LOWER(u.full_name) = LOWER({{params.requesterName}}) AND u.deleted_at IS NULL;
    `,
  });
}

export default notifyRequester;
