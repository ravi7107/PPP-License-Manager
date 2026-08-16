import { getDepartments } from '@/lib/api/departments.api';
import { LookupOption } from '@/app/pages/requests/types';

async function loadDepartmentsForRequests(): Promise<LookupOption[]> {
  const rows = await getDepartments();

  return rows
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, name: d.departmentName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default loadDepartmentsForRequests;
