import { getSoftware } from '@/lib/api/software.api';
import { SoftwareAvailabilityOption } from '@/app/pages/requests/types';

// Software catalog for the request form's software selector. The legacy
// version of this action selected from a "license pool with total seats"
// concept (license_inventory) that doesn't exist in this app's License
// model (individual per-seat License rows, not pools) - so seat capacity
// isn't tracked here. total_seats/available_licenses are always 0; the
// request form no longer displays them (see request-form-dialog.tsx).
async function loadSoftwareForRequests(): Promise<SoftwareAvailabilityOption[]> {
  const rows = await getSoftware();

  return rows
    .filter((s) => s.isActive)
    .map((s) => ({
      license_inventory_id: s.id,
      software_name: s.name,
      vendor: s.vendor,
      total_seats: 0,
      available_licenses: 0,
    }))
    .sort((a, b) => a.software_name.localeCompare(b.software_name));
}

export default loadSoftwareForRequests;
