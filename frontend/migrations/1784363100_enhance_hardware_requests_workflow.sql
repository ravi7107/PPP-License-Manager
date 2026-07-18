-- Migration: Gap-analysis enhancements against original requirements spec.
-- 1) Assets: add remarks field, constrain asset_type to fixed set, remap/constrain status to
--    Allocated/Available/Maintenance/Scrap (preserving existing semantics).
-- 2) Extend asset_allocations into a full Hardware Allocation workflow table (entity/client targets,
--    allocation_type, transfer linkage, notes) mirroring the license_allocations feature set.
-- 3) Requests: broaden request_type to include hardware-specific types + temporary license type,
--    add Cancelled status, add priority + required_from_date/required_until_date.

-- ---------- Assets ----------

ALTER TABLE assets
ADD COLUMN remarks TEXT;

-- Remap existing free-form status values to the spec's fixed set before adding the constraint.
UPDATE assets SET status = 'Maintenance' WHERE status = 'In Repair';
UPDATE assets SET status = 'Scrap' WHERE status IN ('Retired', 'Decommissioned');
UPDATE assets SET status = 'Allocated' WHERE status = 'Active' AND assigned_user_id IS NOT NULL;
UPDATE assets SET status = 'Available' WHERE status = 'Active' AND assigned_user_id IS NULL;
UPDATE assets SET status = 'Available' WHERE status NOT IN ('Allocated', 'Available', 'Maintenance', 'Scrap');

ALTER TABLE assets
ADD CONSTRAINT chk_assets_status CHECK (status IN ('Allocated', 'Available', 'Maintenance', 'Scrap'));

-- Normalize free-text asset_type values into the fixed set, defaulting anything else to Workstation.
UPDATE assets
SET asset_type = CASE
  WHEN asset_type ILIKE 'desktop%' THEN 'Desktop'
  WHEN asset_type ILIKE 'laptop%' THEN 'Laptop'
  WHEN asset_type ILIKE 'server%' THEN 'Server'
  WHEN asset_type ILIKE 'workstation%' THEN 'Workstation'
  ELSE 'Workstation'
END;

ALTER TABLE assets
ADD CONSTRAINT chk_assets_asset_type CHECK (asset_type IN ('Desktop', 'Laptop', 'Workstation', 'Server'));

-- ---------- Asset allocations (Hardware Allocation / Transfer / Return workflow) ----------

ALTER TABLE asset_allocations
ADD COLUMN entity_id BIGINT REFERENCES entities (id),
ADD COLUMN client_id BIGINT REFERENCES clients (id),
ADD COLUMN allocation_type TEXT NOT NULL DEFAULT 'User',
ADD COLUMN action_type TEXT NOT NULL DEFAULT 'Allocate',
ADD COLUMN transferred_to_allocation_id BIGINT REFERENCES asset_allocations (id),
ADD COLUMN notes TEXT;

ALTER TABLE asset_allocations
ADD CONSTRAINT chk_asset_allocations_allocation_type CHECK (allocation_type IN ('User', 'Entity', 'Client')),
ADD CONSTRAINT chk_asset_allocations_action_type CHECK (action_type IN ('Allocate', 'Transfer', 'Return')),
ADD CONSTRAINT chk_asset_allocations_status CHECK (status IN ('Active', 'Released'));

CREATE INDEX idx_asset_allocations_entity_id ON asset_allocations (entity_id);

CREATE INDEX idx_asset_allocations_client_id ON asset_allocations (client_id);

-- ---------- Requests: broaden types/status, add priority + required date window ----------

ALTER TABLE requests
DROP CONSTRAINT IF EXISTS chk_requests_request_type,
DROP CONSTRAINT IF EXISTS chk_requests_status;

ALTER TABLE requests
ADD CONSTRAINT chk_requests_request_type CHECK (
  request_type IN (
    'New License',
    'Reallocation',
    'Release',
    'Temporary License Allocation',
    'Hardware Allocation',
    'Hardware Transfer',
    'Return Hardware'
  )
),
ADD CONSTRAINT chk_requests_status CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled'));

ALTER TABLE requests
ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium',
ADD COLUMN required_from_date DATE,
ADD COLUMN required_until_date DATE;

ALTER TABLE requests
ADD CONSTRAINT chk_requests_priority CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent'));

ALTER TABLE approvals
DROP CONSTRAINT IF EXISTS chk_approvals_decision;

ALTER TABLE approvals
ADD CONSTRAINT chk_approvals_decision CHECK (decision IN ('Pending', 'Approved', 'Rejected', 'Cancelled'));
