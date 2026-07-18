import { action } from '@/lib/uibakery';

function updateSoftwareInventory() {
  return action('updateSoftwareInventory', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH upsert_software AS (
        UPDATE software
        SET name = {{params.softwareName}}, vendor = {{params.vendor}}, license_type = {{params.licenseType}},
            version = {{params.version}}, updated_by = {{params.actorName}}, updated_at = NOW()
        WHERE id = {{params.softwareId}}::bigint
        RETURNING id
      )
      UPDATE license_inventory
      SET
        total_seats = {{params.licenseCount}}::integer,
        cost = {{params.licenseCount}}::numeric * {{params.costPerLicense}}::numeric,
        cost_per_license = {{params.costPerLicense}}::numeric,
        expiry_date = {{params.expiryDate}}::date,
        maintenance_expiry = {{params.maintenanceExpiry}}::date,
        status = {{params.status}},
        entity_id = {{params.entityId}}::bigint,
        department_id = {{params.departmentId}}::bigint,
        client_id = {{params.clientId}}::bigint,
        updated_by = {{params.actorName}},
        updated_at = NOW()
      WHERE id = {{params.id}}::bigint
        AND software_id = (SELECT id FROM upsert_software);
    `,
  });
}

export default updateSoftwareInventory;
