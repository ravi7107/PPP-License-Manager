import { action } from '@/lib/uibakery';

function loadUsersFull() {
  return action('loadUsersFull', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT u.id, u.full_name, u.email, u.role, u.is_team_leader, u.status,
        u.department_id, d.name AS department_name,
        u.entity_id, e.name AS entity_name
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN entities e ON e.id = u.entity_id
      WHERE u.deleted_at IS NULL
      ORDER BY u.full_name;
    `,
  });
}

export default loadUsersFull;
