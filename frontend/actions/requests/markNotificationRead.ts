import { action } from '@/lib/uibakery';

// Marks a single notification as read.
function markNotificationRead() {
  return action('markNotificationRead', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE notifications
      SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
      WHERE id = {{params.notificationId}}::bigint;
    `,
  });
}

export default markNotificationRead;
