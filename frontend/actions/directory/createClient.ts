import { action } from '@/lib/uibakery';

function createClient() {
  return action('createClient', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      INSERT INTO clients (name, code, contact_name, contact_email, contact_phone, status, created_by, updated_by)
      VALUES ({{params.name}}, {{params.code}}, {{params.contactName}}, {{params.contactEmail}}, {{params.contactPhone}}, {{params.status}}, {{params.actorName}}, {{params.actorName}});
    `,
  });
}

export default createClient;
