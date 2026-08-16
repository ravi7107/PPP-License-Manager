import { getUsers } from '@/lib/api/users.api';
import { LookupOption } from '@/app/pages/requests/types';

async function loadUsersForRequests(): Promise<LookupOption[]> {
  const page = await getUsers('', 1, 500);
  const items = Array.isArray(page?.items) ? page.items : [];

  return items
    .filter((u) => u.isActive)
    .map((u) => ({ id: u.id, name: u.fullName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default loadUsersForRequests;
