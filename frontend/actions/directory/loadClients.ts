import { action } from '@/lib/uibakery';

function loadClientsFull() {
  return action('loadClientsFull', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT c.id, c.name, c.code, c.contact_name, c.contact_email, c.contact_phone, c.status,
        (SELECT COUNT(*) FROM assets a WHERE a.client_id = c.id AND a.deleted_at IS NULL) AS asset_count
      FROM clients c
      WHERE c.deleted_at IS NULL
      ORDER BY c.name;
    `,
  });
}

export default loadClientsFull;
