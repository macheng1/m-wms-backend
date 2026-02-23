import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

const envFile = resolve(process.cwd(), 'envs', `.env.${process.env.NODE_ENV || 'development'}`);
dotenv.config({ path: envFile });

async function checkRawData() {
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
    const queryRunner = dataSource.createQueryRunner();

    // 查询最新的入库流水，模拟 TypeORM 的查询
    const result = await queryRunner.query(
      `SELECT
        transaction.id,
        transaction.sku,
        transaction.transactionType,
        transaction.quantity,
        transaction.beforeQty,
        transaction.afterQty,
        transaction.unitId,
        unit.name as unitName,
        unit.code as unitCode,
        unit.symbol as unitSymbol,
        inventory.unitId as inventoryUnitId
       FROM inventory_transactions transaction
       LEFT JOIN units unit ON transaction.unitId = unit.id
       LEFT JOIN inventory inventory ON transaction.sku = inventory.sku AND transaction.tenantId = inventory.tenantId
       WHERE transaction.tenantId='5fe0d179-17be-40b0-89bb-e6224977ee48'
       ORDER BY transaction.createdAt DESC
       LIMIT 1`
    );

    if (result.length > 0) {
      const raw = result[0];
      console.log('📦 RAW 数据（模拟 TypeORM getRawAndEntities）：');
      console.log('┌────────────────────────────────────────────────────┐');
      console.log(`│ entity.unitId:            ${raw.unitId}`);
      console.log(`│ raw.unit_id (未设置):    ${raw.unit_id || 'undefined'}`);
      console.log(`│ raw.inventoryUnitId:     ${raw.inventoryUnitId || 'NULL'} ⚠️`);
      console.log(`│ raw.unitName:           ${raw.unitName}`);
      console.log(`│ beforeQty:               ${raw.beforeQty}`);
      console.log(`│ afterQty:                ${raw.afterQty}`);
      console.log('└────────────────────────────────────────────────────┘');
      console.log('\n问题分析：');
      console.log(`- inventoryUnitId 是 ${raw.inventoryUnitId || 'NULL'}`);
      console.log(`- 如果 inventoryUnitId 是 NULL，换算逻辑不会执行 ❌`);
    }

    queryRunner.release();
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await dataSource.destroy();
  }
}

checkRawData();
