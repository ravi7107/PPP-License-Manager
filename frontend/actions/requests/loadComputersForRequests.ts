import { getAssets } from '@/lib/api/assets.api';
import { LookupOption } from '@/app/pages/requests/types';

async function loadComputersForRequests(): Promise<LookupOption[]> {
  const rows = await getAssets();

  return rows
    .filter((a) => a.isActive)
    .map((a) => ({
      id: a.id,
      name: a.hostName || a.assetName || a.assetTag,
      asset_tag: a.assetTag,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default loadComputersForRequests;
