-- Migration: Support client-wise license allocation and seed initial departments (PTech, EC, AEC)
ALTER TABLE license_inventory
ADD COLUMN client_id BIGINT REFERENCES clients (id);

CREATE INDEX idx_license_inventory_client_id ON license_inventory (client_id);

INSERT INTO departments (name, code, description, created_by, updated_by)
VALUES
  ('PTech', 'PTECH', 'PTech department', 'system', 'system'),
  ('EC', 'EC', 'EC department', 'system', 'system'),
  ('AEC', 'AEC', 'AEC department', 'system', 'system')
ON CONFLICT (code) DO NOTHING;
