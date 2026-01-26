const mysql = require('mysql2/promise');

async function fixAllIndexes() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    port: 3306,
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
  });

  try {
    console.log('Getting all foreign keys...');

    // 获取所有外键
    const [fks] = await connection.execute(`
      SELECT TABLE_NAME, CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'wms_dev'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    console.log('Found foreign keys:', fks);

    // 删除所有外键
    for (const fk of fks) {
      try {
        const sql = `ALTER TABLE \`${fk.TABLE_NAME}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``;
        console.log(`Executing: ${sql}`);
        await connection.execute(sql);
        console.log(`Dropped foreign key: ${fk.CONSTRAINT_NAME} on table ${fk.TABLE_NAME}`);
      } catch (err) {
        console.log(`Error dropping FK ${fk.CONSTRAINT_NAME}: ${err.message}`);
      }
    }

    console.log('\nGetting all indexes starting with IDX_...');

    // 获取所有 IDX_ 开头的索引
    const [indexes] = await connection.execute(`
      SELECT TABLE_NAME, INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = 'wms_dev'
      AND INDEX_NAME LIKE 'IDX_%'
      GROUP BY TABLE_NAME, INDEX_NAME
    `);

    console.log('Found indexes:', indexes.length);

    // 删除所有 IDX_ 索引
    for (const index of indexes) {
      try {
        const sql = `ALTER TABLE \`${index.TABLE_NAME}\` DROP INDEX \`${index.INDEX_NAME}\``;
        console.log(`Executing: ${sql}`);
        await connection.execute(sql);
        console.log(`Dropped index: ${index.INDEX_NAME} on table ${index.TABLE_NAME}`);
      } catch (err) {
        console.log(`Error dropping ${index.INDEX_NAME}: ${err.message}`);
      }
    }

    console.log('\nDone! All indexes and foreign keys have been dropped.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

fixAllIndexes();
