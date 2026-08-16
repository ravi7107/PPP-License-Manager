import { getCompanies } from '@/lib/api/companies.api';
import { LookupOption } from '@/app/pages/requests/types';

// "Entity" in the legacy request schema maps onto this app's Company model.
async function loadEntitiesForRequests(): Promise<LookupOption[]> {
  const rows = await getCompanies();

  return rows
    .filter((c) => c.isActive)
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default loadEntitiesForRequests;
