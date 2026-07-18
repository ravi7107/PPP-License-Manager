import { action } from '@/lib/uibakery';

function updateClient() {
  return action('updateClient', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      UPDATE clients
      SET name = {{params.name}}, code = {{params.code}}, contact_name = {{params.contactName}},
          contact_email = {{params.contactEmail}}, contact_phone = {{params.contactPhone}},
          status = {{params.status}}, updated_by = {{params.actorName}}, updated_at = NOW()
      WHERE id = {{params.id}}::bigint;
    `,
  });
}

export default updateClient;
