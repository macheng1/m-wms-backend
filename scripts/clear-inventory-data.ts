import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
const envFile = resolve(process.cwd(), 'envs', `.env.${process.env.NODE_ENV || 'development'}`);
dotenv.config({ path: envFile });

async function clearInventoryData() {
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
    console.log('数据库连接成功');

    const queryRunner = dataSource.createQueryRunner();

    try {
      // 禁用外键检查
      await queryRunner.query('SET FOREIGN_KEY_CHECKS=0');

      // 清空库存交易记录表
      const transactionResult = await queryRunner.query('TRUNCATE TABLE inventory_transactions');
      console.log('✓ 清空 inventory_transactions 表成功');

      // 清空库存表
      const inventoryResult = await queryRunner.query('TRUNCATE TABLE inventory');
      console.log('✓ 清空 inventory 表成功');

      // 恢复外键检查
      await queryRunner.query('SET FOREIGN_KEY_CHECKS=1');

      console.log('\n所有库存数据清空完成（单位表已保留）');
    } catch (error) {
      console.error('清空数据时出错:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

clearInventoryData()
  .then(() => {
    console.log('操作成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('操作失败:', error);
    process.exit(1);
  });
