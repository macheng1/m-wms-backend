const mysql = require('mysql2/promise');

async function fix() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
  });

  try {
    // 方案1: 将无效的 unitId 设为 null
    await connection.execute(`
      UPDATE inventory i
      LEFT JOIN units u ON i.unitId = u.id
      SET i.unitId = NULL
      WHERE i.unitId IS NOT NULL AND u.id IS NULL
    `);
    console.log('✅ 已清理无效的 unitId');

    // 方案2: 查看受影响的记录
    const [rows] = await connection.execute(`
      SELECT id, sku, productName, unitId
      FROM inventory
      WHERE unitId IS NOT NULL
      AND unitId NOT IN (SELECT id FROM units)
    `);
    console.log('还有无效 unitId 的记录数:', rows.length);
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    await connection.end();
  }
}

fix();
