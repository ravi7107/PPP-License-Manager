import { getClients } from '@/lib/api/clients.api';
import { LookupOption } from '@/app/pages/requests/types';

async function loadClientsForRequests(): Promise<LookupOption[]> {
  const rows = await getClients();

  return rows
    .filter((c) => c.isActive)
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default loadClientsForRequests;
