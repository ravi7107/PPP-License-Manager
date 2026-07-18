-- Migration: Temporary Resource Availability module.
-- Team Leaders can mark a user unavailable for a date range; this exposes the user's currently
-- assigned assets and license seats as "temporarily available" to all Team Leaders, without
-- automatically reallocating anything. Reallocation of a freed resource requires a request that
-- only an IT Administrator can approve (reuses the same approve/reject pattern as other requests).

CREATE TABLE
  user_unavailability_periods (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_unavailability_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_unavailability_status CHECK (status IN ('Active', 'Cancelled', 'Ended'))
  );

CREATE INDEX idx_unavailability_user_id ON user_unavailability_periods (user_id);

CREATE INDEX idx_unavailability_status ON user_unavailability_periods (status);

CREATE INDEX idx_unavailability_dates ON user_unavailability_periods (start_date, end_date);

CREATE TABLE
  reallocation_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unavailability_id BIGINT NOT NULL REFERENCES user_unavailability_periods (id),
    resource_type TEXT NOT NULL,
    asset_id BIGINT REFERENCES assets (id),
    license_allocation_id BIGINT REFERENCES license_allocations (id),
    target_user_id BIGINT REFERENCES users (id),
    requested_by TEXT,
    justification TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    decided_by TEXT,
    decided_at TIMESTAMPTZ,
    decision_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by TEXT,
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_reallocation_resource_type CHECK (resource_type IN ('Asset', 'License')),
    CONSTRAINT chk_reallocation_status CHECK (status IN ('Pending', 'Approved', 'Rejected'))
  );

CREATE INDEX idx_reallocation_unavailability_id ON reallocation_requests (unavailability_id);

CREATE INDEX idx_reallocation_status ON reallocation_requests (status);

CREATE INDEX idx_reallocation_target_user_id ON reallocation_requests (target_user_id);
