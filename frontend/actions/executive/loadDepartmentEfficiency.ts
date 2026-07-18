import { action } from '@/lib/uibakery';

// Department efficiency: headcount, hardware assets, and license spend per department,
// normalized into assets-per-employee and cost-per-employee for cross-department comparison.
function loadDepartmentEfficiency() {
  return action('loadDepartmentEfficiency', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH emp AS (
        SELECT department_id, COUNT(*) AS employee_count
        FROM users WHERE deleted_at IS NULL
        GROUP BY department_id
      ),
      assets_cte AS (
        SELECT department_id, COUNT(*) AS asset_count
        FROM assets WHERE deleted_at IS NULL
        GROUP BY department_id
      ),
      cost_cte AS (
        SELECT department_id, COALESCE(SUM(cost), 0) AS license_cost
        FROM license_inventory WHERE deleted_at IS NULL
        GROUP BY department_id
      )
      SELECT
        COALESCE(d.name, 'Unassigned') AS department_name,
        COALESCE(emp.employee_count, 0) AS employee_count,
        COALESCE(assets_cte.asset_count, 0) AS asset_count,
        COALESCE(cost_cte.license_cost, 0) AS license_cost,
        CASE WHEN COALESCE(emp.employee_count, 0) > 0
          THEN ROUND(COALESCE(assets_cte.asset_count, 0)::numeric / emp.employee_count, 2)
          ELSE 0
        END AS assets_per_employee,
        CASE WHEN COALESCE(emp.employee_count, 0) > 0
          THEN ROUND(COALESCE(cost_cte.license_cost, 0) / emp.employee_count, 2)
          ELSE 0
        END AS cost_per_employee
      FROM departments d
      LEFT JOIN emp ON emp.department_id = d.id
      LEFT JOIN assets_cte ON assets_cte.department_id = d.id
      LEFT JOIN cost_cte ON cost_cte.department_id = d.id
      WHERE d.deleted_at IS NULL
      ORDER BY cost_per_employee DESC;
    `,
  });
}

export default loadDepartmentEfficiency;
