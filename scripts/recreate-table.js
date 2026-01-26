const mysql = require('mysql2/promise');

async function recreateTable() {
  const connection = await mysql.createConnection({
    host: '47.93.46.138',
    port: 3306,
    user: 'wms_dev',
    password: 'yXGWfMNHbzGreP3r',
    database: 'wms_dev',
    multipleStatements: true,
  });

  try {
    console.log('Dropping inventory table if exists...');
    await connection.execute('DROP TABLE IF EXISTS inventory');
    console.log('Dropped inventory table');

    console.log('Dropping units table if exists...');
    await connection.execute('DROP TABLE IF EXISTS units');
    console.log('Dropped units table');

    console.log('Dropping inventory_transactions table if exists...');
    await connection.execute('DROP TABLE IF EXISTS inventory_transactions');
    console.log('Dropped inventory_transactions table');

    console.log('Done! Tables will be recreated by TypeORM synchronize.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

recreateTable();
