-- Migration: Create normalized core schema for PPS Enterprise License & Asset Management System
-- Includes: departments, entities, clients, users, assets, software, software_installations,
-- license_inventory, license_allocations, asset_allocations, requests, approvals, audit_logs, notifications
-- All tables include created_at/updated_at, created_by/updated_by, status, and soft-delete (deleted_at) audit fields.

-- =========================
-- Reference / lookup tables
-- =========================

CREATE TABLE
  departments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_departments_code UNIQUE (code)
  );

CREATE TABLE
  entities (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_entities_code UNIQUE (code)
  );

CREATE TABLE
  clients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_clients_code UNIQUE (code)
  );

-- =========================
-- Users
-- =========================

CREATE TABLE
  users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    department_id BIGINT REFERENCES departments (id),
    entity_id BIGINT REFERENCES entities (id),
    is_team_leader BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_users_email UNIQUE (email)
  );

CREATE INDEX idx_users_department_id ON users (department_id);

CREATE INDEX idx_users_entity_id ON users (entity_id);

-- =========================
-- Assets
-- =========================

CREATE TABLE
  assets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asset_tag TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    model TEXT,
    serial_number TEXT,
    entity_id BIGINT REFERENCES entities (id),
    department_id BIGINT REFERENCES departments (id),
    assigned_user_id BIGINT REFERENCES users (id),
    purchase_date DATE,
    warranty_expiry DATE,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_assets_asset_tag UNIQUE (asset_tag)
  );

CREATE INDEX idx_assets_assigned_user_id ON assets (assigned_user_id);

CREATE INDEX idx_assets_department_id ON assets (department_id);

CREATE INDEX idx_assets_entity_id ON assets (entity_id);

-- =========================
-- Software catalog
-- =========================

CREATE TABLE
  software (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    vendor TEXT NOT NULL,
    license_type TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_software_name_vendor UNIQUE (name, vendor)
  );

-- =========================
-- License inventory (purchased license batches / seat pools)
-- =========================

CREATE TABLE
  license_inventory (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    software_id BIGINT NOT NULL REFERENCES software (id),
    entity_id BIGINT REFERENCES entities (id),
    department_id BIGINT REFERENCES departments (id),
    total_seats INTEGER NOT NULL DEFAULT 0,
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    purchase_date DATE,
    renewal_date DATE,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_license_inventory_total_seats CHECK (total_seats >= 0)
  );

CREATE INDEX idx_license_inventory_software_id ON license_inventory (software_id);

CREATE INDEX idx_license_inventory_entity_id ON license_inventory (entity_id);

-- =========================
-- License allocations (seat assigned to a user/asset)
-- =========================

CREATE TABLE
  license_allocations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    license_inventory_id BIGINT NOT NULL REFERENCES license_inventory (id),
    user_id BIGINT REFERENCES users (id),
    asset_id BIGINT REFERENCES assets (id),
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    release_date DATE,
    is_temporary BOOLEAN NOT NULL DEFAULT FALSE,
    share_end_date DATE,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ
  );

CREATE INDEX idx_license_allocations_license_inventory_id ON license_allocations (license_inventory_id);

CREATE INDEX idx_license_allocations_user_id ON license_allocations (user_id);

CREATE INDEX idx_license_allocations_asset_id ON license_allocations (asset_id);

-- =========================
-- Software installations (software installed on a specific asset)
-- =========================

CREATE TABLE
  software_installations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    software_id BIGINT NOT NULL REFERENCES software (id),
    asset_id BIGINT NOT NULL REFERENCES assets (id),
    license_allocation_id BIGINT REFERENCES license_allocations (id),
    installed_version TEXT,
    installed_date DATE,
    uninstalled_date DATE,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ
  );

CREATE INDEX idx_software_installations_software_id ON software_installations (software_id);

CREATE INDEX idx_software_installations_asset_id ON software_installations (asset_id);

-- =========================
-- Asset allocations (asset assigned to a user/department)
-- =========================

CREATE TABLE
  asset_allocations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asset_id BIGINT NOT NULL REFERENCES assets (id),
    user_id BIGINT REFERENCES users (id),
    department_id BIGINT REFERENCES departments (id),
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    return_date DATE,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ
  );

CREATE INDEX idx_asset_allocations_asset_id ON asset_allocations (asset_id);

CREATE INDEX idx_asset_allocations_user_id ON asset_allocations (user_id);

-- =========================
-- Requests (license requests, temporary release requests, asset requests)
-- =========================

CREATE TABLE
  requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_type TEXT NOT NULL,
    requester_id BIGINT NOT NULL REFERENCES users (id),
    department_id BIGINT REFERENCES departments (id),
    software_id BIGINT REFERENCES software (id),
    asset_id BIGINT REFERENCES assets (id),
    client_id BIGINT REFERENCES clients (id),
    justification TEXT,
    requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_days INTEGER,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ
  );

CREATE INDEX idx_requests_requester_id ON requests (requester_id);

CREATE INDEX idx_requests_software_id ON requests (software_id);

CREATE INDEX idx_requests_status ON requests (status);

-- =========================
-- Approvals (decisions made on requests)
-- =========================

CREATE TABLE
  approvals (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES requests (id),
    approver_id BIGINT NOT NULL REFERENCES users (id),
    decision TEXT NOT NULL DEFAULT 'Pending',
    comment TEXT,
    decided_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ
  );

CREATE INDEX idx_approvals_request_id ON approvals (request_id);

CREATE INDEX idx_approvals_approver_id ON approvals (approver_id);

-- =========================
-- Audit logs (system-wide change tracking)
-- =========================

CREATE TABLE
  audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id BIGINT NOT NULL,
    action TEXT NOT NULL,
    changed_by BIGINT REFERENCES users (id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    old_values JSONB,
    new_values JSONB,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT
  );

CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id);

CREATE INDEX idx_audit_logs_changed_by ON audit_logs (changed_by);

-- =========================
-- Notifications
-- =========================

CREATE TABLE
  notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id),
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ
  );

CREATE INDEX idx_notifications_user_id ON notifications (user_id);

CREATE INDEX idx_notifications_is_read ON notifications (is_read);
