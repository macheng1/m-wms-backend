const mysql = require('mysql2/promise');

async function createTables() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    port: 3306,
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
    multipleStatements: true,
  });

  try {
    console.log('Creating tables...');

    // Create units table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS units (
        id varchar(36) PRIMARY KEY,
        tenantId varchar(255) NULL,
        name varchar(50) NOT NULL,
        code varchar(20) NOT NULL UNIQUE,
        category varchar(20) NOT NULL,
        baseRatio decimal(15,2) NOT NULL DEFAULT 1.00,
        baseUnitCode varchar(20) NOT NULL,
        symbol varchar(20) NULL,
        description varchar(500) NULL,
        isActive int NOT NULL DEFAULT 1,
        sortOrder int NOT NULL DEFAULT 0,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt datetime NULL,
        KEY inventory_unit_id_idx (id),
        KEY units_code_idx (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Created units table');

    // Create inventory table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory (
        id varchar(36) PRIMARY KEY,
        tenantId varchar(255) NOT NULL,
        sku varchar(100) NOT NULL,
        productName varchar(200) NOT NULL,
        quantity decimal(15,2) NOT NULL DEFAULT 0.00,
        unitId varchar(255) NULL,
        location varchar(100) NULL,
        multiUnitQty json NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt datetime NULL,
        KEY inventory_tenant_sku_idx (tenantId, sku),
        KEY inventory_unit_id_idx2 (unitId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Created inventory table');

    // Create inventory_transactions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id varchar(36) PRIMARY KEY,
        tenantId varchar(255) NOT NULL,
        sku varchar(100) NOT NULL,
        transactionType varchar(50) NOT NULL,
        quantity decimal(15,2) NOT NULL,
        unitId varchar(255) NULL,
        beforeQty decimal(15,2) NOT NULL,
        afterQty decimal(15,2) NOT NULL,
        orderNo varchar(100) NULL,
        location varchar(100) NULL,
        remark text NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt datetime NULL,
        KEY inventory_transactions_sku_idx (sku),
        KEY inventory_transactions_unit_idx (unitId),
        KEY inventory_transactions_type_idx (transactionType)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Created inventory_transactions table');

    console.log('Done! Tables created successfully.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

createTables();
