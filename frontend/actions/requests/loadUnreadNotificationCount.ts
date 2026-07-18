import { action } from '@/lib/uibakery';

// Loads the current user's unread notification count, for the bell badge.
function loadUnreadNotificationCount() {
  return action('loadUnreadNotificationCount', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT COUNT(*)::int AS unread_count
      FROM notifications n
      JOIN users u ON u.id = n.user_id
      WHERE u.deleted_at IS NULL AND LOWER(u.full_name) = LOWER({{params.actorName}}) AND n.is_read = FALSE;
    `,
  });
}

export default loadUnreadNotificationCount;
