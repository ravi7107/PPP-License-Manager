import { action } from '@/lib/uibakery';

function loadUsersForRequests() {
  return action('loadUsersForRequests', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, full_name AS name FROM users WHERE deleted_at IS NULL ORDER BY full_name;`,
  });
}

export default loadUsersForRequests;
