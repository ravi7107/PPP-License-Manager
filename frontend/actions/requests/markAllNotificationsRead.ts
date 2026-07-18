import { action } from '@/lib/uibakery';

// Marks all of the current user's unread notifications as read.
function markAllNotificationsRead() {
  return action('markAllNotificationsRead', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE notifications n
      SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
      FROM users u
      WHERE n.user_id = u.id AND LOWER(u.full_name) = LOWER({{params.actorName}}) AND n.is_read = FALSE;
    `,
  });
}

export default markAllNotificationsRead;
