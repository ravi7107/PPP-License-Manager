import {
  getAvailableLicenseResources,
} from '@/lib/api/availability.api';

async function loadAvailableResources() {
  const records = await getAvailableLicenseResources();

  return records.map((record) => ({
    unavailability_id: record.userUnavailabilityId,

    user_id: record.currentUserId,
    user_name: record.currentUserName,

    start_date: record.unavailableFrom,
    end_date: record.unavailableTill,
    reason: record.reason,

    resource_type: 'License' as const,

    asset_id: record.assetId,

    resource_label: record.licenseAliasCode,
    resource_subtype: record.softwareName,

    // Compatibility name expected by the existing UI.
    // This now represents ResourceAllocation.Id.
    license_allocation_id: record.resourceAllocationId,

    software_name: record.softwareName,

    pending_request_id: null,
    request_status: null,
  }));
}

export default loadAvailableResources;
