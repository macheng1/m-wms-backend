const mysql = require('mysql2/promise');

async function convertTables() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    port: 3306,
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
  });

  try {
    const tables = ['inventory', 'inventory_transactions', 'products', 'units'];

    console.log('将所有表转换为 utf8mb4_unicode_ci...\n');

    for (const table of tables) {
      console.log(`转换 ${table} 表...`);
      await connection.execute(`
        ALTER TABLE ${table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log(`✓ ${table} 表已转换`);
    }

    console.log('\n验证转换结果...\n');

    for (const table of tables) {
      const [result] = await connection.execute(`
        SELECT COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = ? AND COLUMN_NAME = 'id'
      `, [table]);

      const collation = result[0]?.COLLATION_NAME || 'N/A';
      console.log(`${table}.id: ${collation}`);
    }

    console.log('\n✓ 所有表已成功转换为 utf8mb4_unicode_ci！');
  } catch (error) {
    console.error('失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

convertTables()
  .then(() => {
    console.log('\n脚本执行成功');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n脚本执行失败:', err);
    process.exit(1);
  });
