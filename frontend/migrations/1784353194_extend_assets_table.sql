-- Migration: Extend assets table with inventory fields required by Asset Inventory module
ALTER TABLE assets
ADD COLUMN computer_name TEXT,
ADD COLUMN host_name TEXT,
ADD COLUMN manufacturer TEXT,
ADD COLUMN operating_system TEXT,
ADD COLUMN location TEXT,
ADD COLUMN client_id BIGINT REFERENCES clients (id);

CREATE INDEX idx_assets_client_id ON assets (client_id);
