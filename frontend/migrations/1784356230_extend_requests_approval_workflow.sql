-- Migration: Request & Approval Workflow.
-- Extends `requests` with the richer allocation targeting model (license pool, allocation type,
-- target user/computer/entity/client) needed to auto-apply an allocation once approved, and relaxes
-- requester_id/approver_id to nullable since users are resolved by name (text actor convention),
-- not linked to UI Bakery auth identity. Adds approver_name/requester_name text columns, and a
-- request_type check constraint.

ALTER TABLE requests
ADD COLUMN license_inventory_id BIGINT REFERENCES license_inventory (id),
ADD COLUMN allocation_type TEXT NOT NULL DEFAULT 'User',
ADD COLUMN entity_id BIGINT REFERENCES entities (id),
ADD COLUMN target_user_id BIGINT REFERENCES users (id),
ADD COLUMN requester_name TEXT;

ALTER TABLE requests
ALTER COLUMN requester_id DROP NOT NULL;

ALTER TABLE requests
ADD CONSTRAINT chk_requests_allocation_type CHECK (allocation_type IN ('User', 'Computer', 'Entity', 'Client')),
ADD CONSTRAINT chk_requests_request_type CHECK (request_type IN ('New License', 'Reallocation', 'Release')),
ADD CONSTRAINT chk_requests_status CHECK (status IN ('Pending', 'Approved', 'Rejected'));

CREATE INDEX idx_requests_license_inventory_id ON requests (license_inventory_id);

CREATE INDEX idx_requests_target_user_id ON requests (target_user_id);

-- Approvals: add approver_name text column (actor convention) and relax approver_id FK to nullable.
ALTER TABLE approvals
ADD COLUMN approver_name TEXT;

ALTER TABLE approvals
ALTER COLUMN approver_id DROP NOT NULL;

ALTER TABLE approvals
ADD CONSTRAINT chk_approvals_decision CHECK (decision IN ('Pending', 'Approved', 'Rejected'));

-- Notifications: relax user_id FK to nullable so a notification insert can be skipped gracefully
-- (via WHERE EXISTS) rather than fail, when no matching user row exists yet for a resolved actor name.
ALTER TABLE notifications
ALTER COLUMN user_id DROP NOT NULL;
