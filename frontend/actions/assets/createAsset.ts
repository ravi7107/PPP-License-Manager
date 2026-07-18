import { action } from '@/lib/uibakery';

function createAsset() {
  return action('createAsset', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO assets (
        asset_tag, asset_type, computer_name, host_name, serial_number, manufacturer, model,
        purchase_date, warranty_expiry, operating_system, location, status, remarks,
        assigned_user_id, department_id, entity_id, client_id, created_by, updated_by
      )
      VALUES (
        {{params.assetTag}}, {{params.assetType}}, {{params.computerName}}, {{params.hostName}},
        {{params.serialNumber}}, {{params.manufacturer}}, {{params.model}},
        {{params.purchaseDate}}::date, {{params.warrantyExpiry}}::date, {{params.operatingSystem}}, {{params.location}}, {{params.status}}, {{params.remarks}},
        {{params.assignedUserId}}::bigint, {{params.departmentId}}::bigint, {{params.entityId}}::bigint, {{params.clientId}}::bigint,
        {{params.actorName}}, {{params.actorName}}
      )
      RETURNING id;
    `,
  });
}

export default createAsset;
