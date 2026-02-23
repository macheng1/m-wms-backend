const mysql = require('mysql2/promise');

async function createTables() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    port: 3306,
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
  });

  try {
    console.log('开始创建库位相关表...');

    // 创建 locations 表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS locations (
        id varchar(36) NOT NULL,
        tenantId varchar(36) NOT NULL,
        code varchar(50) NOT NULL,
        name varchar(200) NOT NULL,
        warehouse varchar(50) NOT NULL,
        area varchar(50) NOT NULL,
        shelf varchar(50) DEFAULT NULL,
        level varchar(50) DEFAULT NULL,
        position varchar(50) DEFAULT NULL,
        type enum('STORAGE','PICKING','TEMP','RECEIVING','SHIPPING','DEFECT','RETURN') DEFAULT 'STORAGE',
        status enum('AVAILABLE','OCCUPIED','LOCKED','RESERVED','DISABLED') DEFAULT 'AVAILABLE',
        capacity int DEFAULT NULL,
        capacityUnit varchar(50) DEFAULT NULL,
        dimensions json DEFAULT NULL,
        coordinates json DEFAULT NULL,
        deviceIds json DEFAULT NULL,
        remark text,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY locations_code_idx (code),
        KEY locations_tenant_id_idx (tenantId),
        KEY locations_warehouse_idx (warehouse),
        KEY locations_area_idx (area),
        KEY locations_type_idx (type),
        KEY locations_status_idx (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ locations 表创建完成');

    // 创建 devices 表（预留）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS devices (
        id varchar(36) NOT NULL,
        tenantId varchar(36) NOT NULL,
        code varchar(50) NOT NULL,
        name varchar(200) NOT NULL,
        type enum('SCANNER','RFID_READER','AGV','ESL','SENSOR') NOT NULL,
        status enum('ONLINE','OFFLINE','MAINTENANCE','ERROR') DEFAULT 'OFFLINE',
        ipAddress varchar(50) DEFAULT NULL,
        port int DEFAULT NULL,
        config json DEFAULT NULL,
        lastHeartbeat datetime(6) DEFAULT NULL,
        locationId varchar(36) DEFAULT NULL,
        remark text,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY devices_code_idx (code),
        KEY devices_tenant_id_idx (tenantId),
        KEY devices_type_idx (type),
        KEY devices_status_idx (status),
        KEY devices_location_id_idx (locationId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ devices 表创建完成');

    // 创建 device_events 表（预留）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS device_events (
        id varchar(36) NOT NULL,
        tenantId varchar(36) NOT NULL,
        deviceId varchar(36) NOT NULL,
        eventType varchar(50) NOT NULL,
        eventData json DEFAULT NULL,
        locationId varchar(36) DEFAULT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY device_events_device_id_idx (deviceId),
        KEY device_events_type_idx (eventType),
        KEY device_events_created_at_idx (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ device_events 表创建完成');

    // 创建 inventory_locations 表（预留）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory_locations (
        id varchar(36) NOT NULL,
        tenantId varchar(36) NOT NULL,
        sku varchar(100) NOT NULL,
        locationId varchar(36) NOT NULL,
        quantity decimal(15,2) NOT NULL DEFAULT '0.00',
        batchNo varchar(100) DEFAULT NULL,
        unitId varchar(36) DEFAULT NULL,
        realtime tinyint(1) DEFAULT '0',
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY inventory_locations_sku_location_idx (sku, locationId),
        KEY inventory_locations_tenant_id_idx (tenantId),
        KEY inventory_locations_location_id_idx (locationId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ inventory_locations 表创建完成');

    console.log('所有表创建完成！');
  } catch (error) {
    console.error('创建表失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createTables()
  .then(() => {
    console.log('脚本执行成功');
    process.exit(0);
  })
  .catch((err) => {
    console.error('脚本执行失败:', err);
    process.exit(1);
  });
