const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    port: 3306,
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
  });

  try {
    console.log('开始迁移...');

    // 检查 inventory 表是否还有 location 列
    const [inventoryColumns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = 'inventory' AND COLUMN_NAME = 'location'
    `);

    if (inventoryColumns.length > 0) {
      console.log('重命名 inventory.location -> locationId');
      await connection.execute(`
        ALTER TABLE inventory CHANGE COLUMN location locationId VARCHAR(100) NULL
      `);
      console.log('✓ inventory 表迁移完成');
    } else {
      console.log('✓ inventory 表已迁移，跳过');
    }

    // 检查 inventory_transactions 表是否还有 location 列
    const [transactionColumns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = 'inventory_transactions' AND COLUMN_NAME = 'location'
    `);

    if (transactionColumns.length > 0) {
      console.log('重命名 inventory_transactions.location -> locationId');
      await connection.execute(`
        ALTER TABLE inventory_transactions CHANGE COLUMN location locationId VARCHAR(100) NULL
      `);
      console.log('✓ inventory_transactions 表迁移完成');
    } else {
      console.log('✓ inventory_transactions 表已迁移，跳过');
    }

    // 添加索引（如果不存在）
    try {
      await connection.execute(`
        ALTER TABLE inventory ADD INDEX inventory_location_id_idx (locationId)
      `);
      console.log('✓ inventory 索引添加完成');
    } catch (e) {
      if (!e.message.includes('Duplicate key name')) {
        console.log('索引可能已存在:', e.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE inventory_transactions ADD INDEX inventory_transaction_location_id_idx (locationId)
      `);
      console.log('✓ inventory_transactions 索引添加完成');
    } catch (e) {
      if (!e.message.includes('Duplicate key name')) {
        console.log('索引可能已存在:', e.message);
      }
    }

    console.log('迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate()
  .then(() => {
    console.log('脚本执行成功');
    process.exit(0);
  })
  .catch((err) => {
    console.error('脚本执行失败:', err);
    process.exit(1);
  });
