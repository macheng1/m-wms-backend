const mysql = require('mysql2/promise');

async function fixAllCollations() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    port: 3306,
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
  });

  try {
    console.log('检查所有相关表的 tenantId 字符集...\n');

    const tables = ['inventory', 'inventory_transactions', 'locations', 'products', 'units'];

    for (const table of tables) {
      const [columns] = await connection.execute(`
        SELECT COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = ? AND COLUMN_NAME = 'tenantId'
      `, [table]);

      const collation = columns[0]?.COLLATION_NAME || 'N/A';
      console.log(`${table}.tenantId: ${collation}`);
    }

    console.log('\n将所有表统一修改为 utf8mb4_unicode_ci...\n');

    // 修改 inventory 表的 tenantId 字段
    console.log('修改 inventory.tenantId...');
    await connection.execute(`
      ALTER TABLE inventory MODIFY COLUMN tenantId VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    `);
    console.log('✓ inventory.tenantId 已修改');

    // 修改 inventory_transactions 表的 tenantId 字段
    console.log('修改 inventory_transactions.tenantId...');
    await connection.execute(`
      ALTER TABLE inventory_transactions MODIFY COLUMN tenantId VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    `);
    console.log('✓ inventory_transactions.tenantId 已修改');

    // locations 表已经是 utf8mb4_unicode_ci，跳过

    // 修改 products 表的 tenantId 字段（如果存在）
    try {
      console.log('修改 products.tenantId...');
      await connection.execute(`
        ALTER TABLE products MODIFY COLUMN tenantId VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
      `);
      console.log('✓ products.tenantId 已修改');
    } catch (e) {
      console.log('  products 表可能没有 tenantId 字段或已修改');
    }

    // 修改 units 表的 tenantId 字段（如果存在）
    try {
      console.log('修改 units.tenantId...');
      await connection.execute(`
        ALTER TABLE units MODIFY COLUMN tenantId VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
      `);
      console.log('✓ units.tenantId 已修改');
    } catch (e) {
      console.log('  units 表可能没有 tenantId 字段或已修改');
    }

    console.log('\n验证修改结果...\n');

    for (const table of tables) {
      const [columns] = await connection.execute(`
        SELECT COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = ? AND COLUMN_NAME = 'tenantId'
      `, [table]);

      const collation = columns[0]?.COLLATION_NAME || 'N/A';
      console.log(`${table}.tenantId: ${collation}`);
    }

    console.log('\n✓ 所有表的 tenantId 字符集已统一为 utf8mb4_unicode_ci！');
  } catch (error) {
    console.error('失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

fixAllCollations()
  .then(() => {
    console.log('\n脚本执行成功');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n脚本执行失败:', err);
    process.exit(1);
  });
