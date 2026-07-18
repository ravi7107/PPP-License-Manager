import { action } from '@/lib/uibakery';

// Loads the current user's most recent notifications (requires their name to match a users row).
function loadMyNotifications() {
  return action('loadMyNotifications', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT n.id, n.notification_type, n.title, n.message, n.is_read, n.read_at, n.created_at
      FROM notifications n
      JOIN users u ON u.id = n.user_id
      WHERE u.deleted_at IS NULL AND LOWER(u.full_name) = LOWER({{params.actorName}})
      ORDER BY n.created_at DESC
      LIMIT 20;
    `,
  });
}

export default loadMyNotifications;
