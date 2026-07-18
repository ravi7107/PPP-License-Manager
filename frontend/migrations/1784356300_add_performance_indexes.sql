-- Migration: Add performance indexes on frequently filtered/sorted columns used by
-- dashboard, reports, and executive dashboard queries (status, dates, department/client FKs).
CREATE INDEX idx_license_inventory_status ON license_inventory (status);

CREATE INDEX idx_license_inventory_renewal_date ON license_inventory (renewal_date);

CREATE INDEX idx_license_inventory_department_id ON license_inventory (department_id);

CREATE INDEX idx_assets_status ON assets (status);

CREATE INDEX idx_license_allocations_status ON license_allocations (status);

CREATE INDEX idx_requests_department_id ON requests (department_id);

CREATE INDEX idx_requests_client_id ON requests (client_id);
