-- 库位管理相关表创建脚本
-- 执行方式：mysql -u root -p wms_dev < create-location-tables.sql

USE wms_dev;

-- 1. 库位表
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  warehouse VARCHAR(20) NOT NULL,
  area VARCHAR(20) NOT NULL,
  shelf VARCHAR(20) NULL,
  level VARCHAR(20) NULL,
  position VARCHAR(20) NULL,
  type ENUM('STORAGE', 'PICKING', 'TEMP', 'RECEIVING', 'SHIPPING', 'DEFECT', 'RETURN') DEFAULT 'STORAGE',
  status ENUM('AVAILABLE', 'OCCUPIED', 'LOCKED', 'RESERVED', 'DISABLED') DEFAULT 'AVAILABLE',
  capacity DECIMAL(10,2) NULL,
  capacity_unit VARCHAR(20) NULL,
  dimensions JSON NULL,
  coordinates JSON NULL,
  device_ids JSON NULL,
  metadata JSON NULL,
  remark TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_code (code),
  KEY idx_tenant_code (tenant_id, code),
  KEY idx_tenant_warehouse_area (tenant_id, warehouse, area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库位表';

-- 2. 设备表（预留硬件集成）
CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('SCANNER', 'RFID_READER', 'RFID_TAG', 'AGV', 'ESL', 'SENSOR', 'PRINTER', 'GATE', 'CAMERA', 'PDA') NOT NULL,
  status ENUM('ONLINE', 'OFFLINE', 'ERROR', 'MAINTENANCE', 'DISABLED') DEFAULT 'OFFLINE',
  location_id VARCHAR(36) NULL,
  config JSON NULL,
  last_heartbeat DATETIME NULL,
  metadata JSON NULL,
  remark TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_code (code),
  KEY idx_tenant_code (tenant_id, code),
  KEY idx_tenant_type (tenant_id, type),
  KEY idx_tenant_location (tenant_id, location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备表';

-- 3. 设备事件日志表（预留硬件集成）
CREATE TABLE IF NOT EXISTS device_events (
  id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  device_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(50) NOT NULL COMMENT 'SCAN, TAG_READ, PICK, PUT, ERROR等',
  event_data JSON NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tenant_device (tenant_id, device_id),
  KEY idx_tenant_type_processed (tenant_id, event_type, processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备事件日志表';

-- 4. 库存明细表（库位维度，预留）
CREATE TABLE IF NOT EXISTS inventory_locations (
  id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  location_id VARCHAR(36) NOT NULL,
  quantity DECIMAL(15,2) DEFAULT 0,
  unit_id VARCHAR(36) NULL,
  batch_no VARCHAR(50) NULL,
  production_date DATE NULL,
  expiry_date DATE NULL,
  locked_quantity DECIMAL(15,2) DEFAULT 0,
  realtime_data JSON NULL,
  metadata JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tenant_sku (tenant_id, sku),
  KEY idx_tenant_location (tenant_id, location_id),
  UNIQUE KEY uk_tenant_sku_location_batch (tenant_id, sku, location_id, batch_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存明细表（库位维度）';

-- 外键约束（可选，根据需要添加）
-- ALTER TABLE devices ADD CONSTRAINT fk_device_location FOREIGN KEY (location_id) REFERENCES locations(id);
-- ALTER TABLE inventory_locations ADD CONSTRAINT fk_inventory_location FOREIGN KEY (location_id) REFERENCES locations(id);

-- 插入测试数据（可选）
INSERT INTO locations (id, tenant_id, code, name, warehouse, area, shelf, level, position, type, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', '5fe0d179-17be-40b0-89bb-e6224977ee48', 'A01-01-01-01', 'A01区01号货架1层1位', 'A01', '01', '01', '01', '01', 'STORAGE', 'AVAILABLE'),
('550e8400-e29b-41d4-a716-446655440002', '5fe0d179-17be-40b0-89bb-e6224977ee48', 'A01-01-01-02', 'A01区01号货架1层2位', 'A01', '01', '01', '01', '02', 'STORAGE', 'AVAILABLE'),
('550e8400-e29b-41d4-a716-446655440003', '5fe0d179-17be-40b0-89bb-e6224977ee48', 'A01-01-01-03', 'A01区01号货架1层3位', 'A01', '01', '01', '01', '03', 'STORAGE', 'AVAILABLE');

SELECT '库位管理表创建完成！' AS 'Result';
