-- Migration: Custom Access Management - DB-backed role-to-module access matrix.
-- Lets Super Administrators grant/revoke module visibility per role at runtime,
-- instead of relying only on the hard-coded MODULE_ACCESS map in app code.

CREATE TABLE
  role_module_access (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name TEXT NOT NULL,
    module_key TEXT NOT NULL,
    is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    CONSTRAINT uq_role_module_access UNIQUE (role_name, module_key)
  );

CREATE INDEX idx_role_module_access_role ON role_module_access (role_name);

-- Seed with current defaults from lib/auth/roles.ts MODULE_ACCESS map,
-- so behavior is unchanged until an admin edits the matrix.
INSERT INTO
  role_module_access (role_name, module_key, is_allowed)
VALUES
  ('Super Administrator', 'dashboard', TRUE),
  ('IT Administrator', 'dashboard', TRUE),
  ('Team Leader', 'dashboard', TRUE),
  ('Management', 'dashboard', TRUE),
  ('Super Administrator', 'hardware', TRUE),
  ('IT Administrator', 'hardware', TRUE),
  ('Team Leader', 'hardware', TRUE),
  ('Super Administrator', 'licenses', TRUE),
  ('IT Administrator', 'licenses', TRUE),
  ('Management', 'licenses', TRUE),
  ('Super Administrator', 'allocations', TRUE),
  ('IT Administrator', 'allocations', TRUE),
  ('Team Leader', 'allocations', TRUE),
  ('Super Administrator', 'availability', TRUE),
  ('IT Administrator', 'availability', TRUE),
  ('Team Leader', 'availability', TRUE),
  ('Super Administrator', 'approvals', TRUE),
  ('IT Administrator', 'approvals', TRUE),
  ('Team Leader', 'myRequests', TRUE),
  ('Super Administrator', 'reports', TRUE),
  ('IT Administrator', 'reports', TRUE),
  ('Management', 'reports', TRUE),
  ('Super Administrator', 'search', TRUE),
  ('IT Administrator', 'search', TRUE),
  ('Team Leader', 'search', TRUE),
  ('Management', 'search', TRUE),
  ('Super Administrator', 'executive', TRUE),
  ('Management', 'executive', TRUE),
  ('Super Administrator', 'users', TRUE),
  ('IT Administrator', 'users', TRUE),
  ('Super Administrator', 'departments', TRUE),
  ('IT Administrator', 'departments', TRUE),
  ('Super Administrator', 'entities', TRUE),
  ('IT Administrator', 'entities', TRUE),
  ('Super Administrator', 'clients', TRUE),
  ('IT Administrator', 'clients', TRUE),
  ('Super Administrator', 'accessManagement', TRUE);
