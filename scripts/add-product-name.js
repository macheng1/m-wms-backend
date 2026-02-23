const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
  });

  try {
    // 检查字段是否已存在
    const [rows] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'inventory_transactions'
      AND COLUMN_NAME = 'productName'
      AND TABLE_SCHEMA = 'wms_dev'
    `);

    if (rows.length === 0) {
      // 添加 productName 字段
      await connection.execute(`
        ALTER TABLE inventory_transactions
        ADD COLUMN productName VARCHAR(200) NOT NULL DEFAULT '' AFTER sku
      `);
      console.log('✅ productName 字段添加成功');

      // 为已有数据填充 productName
      await connection.execute(`
        UPDATE inventory_transactions it
        INNER JOIN products p ON it.sku = p.code AND it.tenantId = p.tenantId
        SET it.productName = p.name
        WHERE it.productName = ''
      `);
      console.log('✅ 已有数据的 productName 已填充');
    } else {
      console.log('⚠️  productName 字段已存在，跳过');
    }
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
