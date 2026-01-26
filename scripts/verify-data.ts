import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
const envFile = resolve(process.cwd(), 'envs', `.env.${process.env.NODE_ENV || 'development'}`);
dotenv.config({ path: envFile });

async function verifyData() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功\n');

    const queryRunner = dataSource.createQueryRunner();

    try {
      // 检查库存表
      const inventoryCount = await queryRunner.query('SELECT COUNT(*) as count FROM inventory');
      console.log(`inventory 表记录数: ${inventoryCount[0].count}`);

      // 检查库存交易表
      const transactionsCount = await queryRunner.query('SELECT COUNT(*) as count FROM inventory_transactions');
      console.log(`inventory_transactions 表记录数: ${transactionsCount[0].count}`);

      // 检查单位表
      const unitCount = await queryRunner.query('SELECT COUNT(*) as count FROM units');
      console.log(`units 表记录数: ${unitCount[0].count}（已保留）`);

      // 显示单位表数据
      if (unitCount[0].count > 0) {
        const units = await queryRunner.query('SELECT id, name, code FROM units LIMIT 5');
        console.log('\n单位表前5条记录:');
        console.table(units);
      }
    } finally {
      await queryRunner.release();
    }
  } finally {
    await dataSource.destroy();
  }
}

verifyData().catch(console.error);
