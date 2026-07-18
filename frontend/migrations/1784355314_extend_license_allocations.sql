-- Migration: Support License Allocation module - direct entity/client-wise allocation tracking,
-- allocation type (User/Computer/Entity/Client), and free-form notes for transfer/release context.
ALTER TABLE license_allocations
ADD COLUMN entity_id BIGINT REFERENCES entities (id),
ADD COLUMN client_id BIGINT REFERENCES clients (id),
ADD COLUMN allocation_type TEXT NOT NULL DEFAULT 'User',
ADD COLUMN notes TEXT;

CREATE INDEX idx_license_allocations_entity_id ON license_allocations (entity_id);

CREATE INDEX idx_license_allocations_client_id ON license_allocations (client_id);

ALTER TABLE license_allocations
ADD CONSTRAINT chk_license_allocations_type CHECK (allocation_type IN ('User', 'Computer', 'Entity', 'Client'));
