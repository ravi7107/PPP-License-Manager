-- Migration: Extend software/license_inventory tables with fields required by Software Inventory module
ALTER TABLE software
ADD COLUMN version TEXT;

ALTER TABLE license_inventory
ADD COLUMN cost_per_license NUMERIC(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN expiry_date DATE,
ADD COLUMN maintenance_expiry DATE;
