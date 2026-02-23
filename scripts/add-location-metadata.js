const mysql = require('mysql2/promise');

async function addMetadataColumn() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    port: 3306,
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
  });

  try {
    console.log('添加 metadata 字段...');

    // 检查 metadata 列是否已存在
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'wms_dev' AND TABLE_NAME = 'locations' AND COLUMN_NAME = 'metadata'
    `);

    if (columns.length === 0) {
      await connection.execute(`
        ALTER TABLE locations ADD COLUMN metadata json DEFAULT NULL AFTER deviceIds
      `);
      console.log('✓ locations.metadata 字段添加完成');
    } else {
      console.log('✓ metadata 字段已存在，跳过');
    }

    console.log('完成！');
  } catch (error) {
    console.error('失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

addMetadataColumn()
  .then(() => {
    console.log('脚本执行成功');
    process.exit(0);
  })
  .catch((err) => {
    console.error('脚本执行失败:', err);
    process.exit(1);
  });
