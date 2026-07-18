import { action } from '@/lib/uibakery';

function loadDepartmentsFull() {
  return action('loadDepartmentsFull', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT d.id, d.name, d.code, d.description, d.status,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.deleted_at IS NULL) AS user_count
      FROM departments d
      WHERE d.deleted_at IS NULL
      ORDER BY d.name;
    `,
  });
}

export default loadDepartmentsFull;
