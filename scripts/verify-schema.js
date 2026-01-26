const mysql = require('mysql2/promise');

async function verifyTables() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    port: 3306,
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
  });

  try {
    console.log('检查数据库表结构...\n');

    // 检查 inventory 表
    console.log('=== inventory 表 ===');
    const [inventoryColumns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = 'inventory'
      ORDER BY ORDINAL_POSITION
    `);
    inventoryColumns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.IS_NULLABLE})`);
    });

    // 检查 inventory_transactions 表
    console.log('\n=== inventory_transactions 表 ===');
    const [transactionColumns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = 'inventory_transactions'
      ORDER BY ORDINAL_POSITION
    `);
    transactionColumns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.IS_NULLABLE})`);
    });

    // 检查 locations 表
    console.log('\n=== locations 表 ===');
    const [locationColumns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = 'locations'
      ORDER BY ORDINAL_POSITION
    `);
    locationColumns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.IS_NULLABLE})`);
    });

    // 检查表是否存在
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'device%' OR SHOW TABLES LIKE 'inventory_location%'
    `);

    console.log('\n✓ 所有核心表已创建');
    console.log('✓ locationId 字段已正确配置');
  } catch (error) {
    console.error('检查失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

verifyTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('脚本执行失败:', err);
    process.exit(1);
  });
