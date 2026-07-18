import { action } from '@/lib/uibakery';

// Upserts the software catalog entry (by name+vendor) then creates a license inventory record for it,
// allocated to an entity, department, and/or client.
function createSoftwareInventory() {
  return action('createSoftwareInventory', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      WITH upsert_software AS (
        INSERT INTO software (name, vendor, license_type, version, created_by, updated_by)
        VALUES ({{params.softwareName}}, {{params.vendor}}, {{params.licenseType}}, {{params.version}}, {{params.actorName}}, {{params.actorName}})
        ON CONFLICT (name, vendor) DO UPDATE
        SET version = EXCLUDED.version, license_type = EXCLUDED.license_type, updated_by = EXCLUDED.updated_by, updated_at = NOW()
        RETURNING id
      )
      INSERT INTO license_inventory (
        software_id, entity_id, department_id, client_id, total_seats, cost, cost_per_license,
        expiry_date, maintenance_expiry, status, created_by, updated_by
      )
      SELECT
        id,
        {{params.entityId}}::bigint,
        {{params.departmentId}}::bigint,
        {{params.clientId}}::bigint,
        {{params.licenseCount}}::integer,
        {{params.licenseCount}}::numeric * {{params.costPerLicense}}::numeric,
        {{params.costPerLicense}}::numeric,
        {{params.expiryDate}}::date,
        {{params.maintenanceExpiry}}::date,
        {{params.status}},
        {{params.actorName}},
        {{params.actorName}}
      FROM upsert_software
      RETURNING id;
    `,
  });
}

export default createSoftwareInventory;
