const mysql = require('mysql2/promise');

async function fixCollation() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    port: 3306,
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
  });

  try {
    console.log('检查 locations 表的字符集...');

    // 检查当前字符集
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = 'locations'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n当前 locations 表字段:');
    columns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLLATION_NAME || 'N/A'}`);
    });

    // 检查 inventory 表的 tenantId 字符集
    const [invColumns] = await connection.execute(`
      SELECT COLUMN_NAME, COLLATION_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = 'inventory' AND COLUMN_NAME = 'tenantId'
    `);
    console.log('\ninventory.tenantId 字符集:', invColumns[0]?.COLLATION_NAME || 'N/A');

    // 修改 locations 表的字符集为 utf8mb4_unicode_ci
    console.log('\n修改 locations 表字符集为 utf8mb4_unicode_ci...');

    // 修改表默认字符集
    await connection.execute(`
      ALTER TABLE locations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    console.log('✓ locations 表字符集已修改为 utf8mb4_unicode_ci');

    // 验证修改
    const [newColumns] = await connection.execute(`
      SELECT COLUMN_NAME, COLLATION_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = 'locations'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n修改后 locations 表字段:');
    newColumns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLLATION_NAME || 'N/A'}`);
    });

    console.log('\n✓ 修复完成！');
  } catch (error) {
    console.error('失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

fixCollation()
  .then(() => {
    console.log('脚本执行成功');
    process.exit(0);
  })
  .catch((err) => {
    console.error('脚本执行失败:', err);
    process.exit(1);
  });
