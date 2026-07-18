import { action } from '@/lib/uibakery';

// Software license pools with computed available seats, for the allocation form's software selector.
export function loadSoftwareWithAvailability() {
  return action('loadSoftwareWithAvailability', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT
        li.id AS license_inventory_id,
        s.name AS software_name,
        s.vendor,
        li.total_seats,
        COALESCE(used.used_licenses, 0) AS used_licenses,
        GREATEST(li.total_seats - COALESCE(used.used_licenses, 0), 0) AS available_licenses
      FROM license_inventory li
      JOIN software s ON s.id = li.software_id
      LEFT JOIN (
        SELECT license_inventory_id, COUNT(*) AS used_licenses
        FROM license_allocations
        WHERE deleted_at IS NULL AND status = 'Active'
        GROUP BY license_inventory_id
      ) used ON used.license_inventory_id = li.id
      WHERE li.deleted_at IS NULL AND li.status = 'Active'
      ORDER BY s.name;
    `,
  });
}

export function loadUsersForAllocations() {
  return action('loadUsersForAllocations', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, full_name AS name FROM users WHERE deleted_at IS NULL ORDER BY full_name;`,
  });
}

export function loadComputersForAllocations() {
  return action('loadComputersForAllocations', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `
      SELECT id, COALESCE(computer_name, asset_tag) AS name, asset_tag
      FROM assets
      WHERE deleted_at IS NULL
      ORDER BY computer_name NULLS LAST, asset_tag;
    `,
  });
}

export function loadEntitiesForAllocations() {
  return action('loadEntitiesForAllocations', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, name FROM entities WHERE deleted_at IS NULL ORDER BY name;`,
  });
}

export function loadClientsForAllocations() {
  return action('loadClientsForAllocations', 'SQL', {
    datasourceName: 'PPS License Asset DB',
    query: `SELECT id, name FROM clients WHERE deleted_at IS NULL ORDER BY name;`,
  });
}
