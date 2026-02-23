-- Migration script: Change location string to locationId reference
-- Run this script to update the database schema

USE wms_dev;

-- Rename location to locationId in inventory table
ALTER TABLE inventory CHANGE COLUMN location locationId VARCHAR(100) NULL;

-- Rename location to locationId in inventory_transactions table
ALTER TABLE inventory_transactions CHANGE COLUMN location locationId VARCHAR(100) NULL;

-- Add indexes for better query performance
ALTER TABLE inventory ADD INDEX inventory_location_id_idx (locationId);
ALTER TABLE inventory_transactions ADD INDEX inventory_transaction_location_id_idx (locationId);

SELECT 'Schema migration completed successfully' as message;
