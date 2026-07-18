import { action } from '@/lib/uibakery';

function updateAsset() {
  return action('updateAsset', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE assets
      SET
        asset_tag = {{params.assetTag}},
        asset_type = {{params.assetType}},
        computer_name = {{params.computerName}},
        host_name = {{params.hostName}},
        serial_number = {{params.serialNumber}},
        manufacturer = {{params.manufacturer}},
        model = {{params.model}},
        purchase_date = {{params.purchaseDate}}::date,
        warranty_expiry = {{params.warrantyExpiry}}::date,
        operating_system = {{params.operatingSystem}},
        location = {{params.location}},
        status = {{params.status}},
        remarks = {{params.remarks}},
        assigned_user_id = {{params.assignedUserId}}::bigint,
        department_id = {{params.departmentId}}::bigint,
        entity_id = {{params.entityId}}::bigint,
        client_id = {{params.clientId}}::bigint,
        updated_by = {{params.actorName}},
        updated_at = NOW()
      WHERE id = {{params.id}}::bigint;
    `,
  });
}

export default updateAsset;
