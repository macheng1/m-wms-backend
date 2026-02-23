const mysql = require('mysql2/promise');

async function checkCollations() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    port: 3306,
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
  });

  try {
    console.log('检查所有相关表的字段字符集...\n');

    const tables = {
      inventory: ['id', 'tenantId', 'sku', 'locationId', 'unitId'],
      inventory_transactions: ['id', 'tenantId', 'sku', 'locationId', 'unitId'],
      locations: ['id', 'tenantId', 'code', 'name'],
      products: ['id', 'tenantId', 'code'],
      units: ['id', 'tenantId', 'code'],
    };

    for (const [table, columns] of Object.entries(tables)) {
      console.log(`\n=== ${table} 表 ===`);
      for (const column of columns) {
        const [result] = await connection.execute(`
          SELECT COLLATION_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = ? AND COLUMN_NAME = ?
        `, [table, column]);

        const collation = result[0]?.COLLATION_NAME || 'N/A';
        console.log(`  ${column}: ${collation}`);
      }
    }

    console.log('\n\n查找所有非 utf8mb4_unicode_ci 的字符字段...\n');

    const [allColumns] = await connection.execute(`
      SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'wms_dev'
        AND TABLE_NAME IN ('inventory', 'inventory_transactions', 'locations', 'products', 'units')
        AND COLLATION_NAME IS NOT NULL
        AND COLLATION_NAME != 'utf8mb4_unicode_ci'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);

    if (allColumns.length > 0) {
      console.log('发现使用其他字符集的字段:');
      allColumns.forEach(col => {
        console.log(`  ${col.TABLE_NAME}.${col.COLUMN_NAME}: ${col.COLLATION_NAME}`);
      });
    } else {
      console.log('✓ 所有字符字段都使用 utf8mb4_unicode_ci');
    }

  } catch (error) {
    console.error('失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

checkCollations()
  .then(() => {
    console.log('\n脚本执行成功');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n脚本执行失败:', err);
    process.exit(1);
  });
