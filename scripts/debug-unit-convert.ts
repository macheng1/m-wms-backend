import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

const envFile = resolve(process.cwd(), 'envs', `.env.${process.env.NODE_ENV || 'development'}`);
dotenv.config({ path: envFile });

async function checkTransaction() {
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

    // 查询最新的入库流水，包括 inventory_unit_id
    const result = await queryRunner.query(
      `SELECT
        t.id,
        t.sku,
        t.transactionType,
        t.quantity,
        t.beforeQty,
        t.afterQty,
        t.unitId,
        i.unitId as inventoryUnitId,
        i.quantity as inventoryQuantity
       FROM inventory_transactions t
       LEFT JOIN inventory i ON t.sku = i.sku AND t.tenantId = i.tenantId
       WHERE t.tenantId='5fe0d179-17be-40b0-89bb-e6224977ee48'
       ORDER BY t.createdAt DESC
       LIMIT 1`
    );

    if (result.length > 0) {
      const tx = result[0];
      console.log('📦 最新入库流水记录：');
      console.log('┌────────────────────────────────────────────────────┐');
      console.log(`│ 流水单位ID:    ${tx.unitId}`); // d24bbbff-d4bf-4e16-bcf4-be25cb20e523
      console.log(`│ 库存单位ID:    ${tx.inventoryUnitId}`); // 8830de4c-d458-42aa-9181-44045c765ca3
      console.log(`│ beforeQty:     ${tx.beforeQty} (数据库，库存主单位)`);
      console.log(`│ afterQty:      ${tx.afterQty} (数据库，库存主单位)`);
      console.log('└────────────────────────────────────────────────────┘');

      // 查询单位
      const units = await queryRunner.query(
        `SELECT id, code, name, baseRatio, baseUnitCode
         FROM units
         WHERE id IN ('${tx.unitId}', '${tx.inventoryUnitId}')
         AND tenantId='5fe0d179-17be-40b0-89bb-e6224977ee48'`
      );

      const txUnit = units.find(u => u.id === tx.unitId);
      const invUnit = units.find(u => u.id === tx.inventoryUnitId);

      console.log('\n📏 单位信息：');
      console.log(`流水单位: ${txUnit.name} (${txUnit.code}), baseRatio: ${txUnit.baseRatio}`);
      console.log(`库存单位: ${invUnit.name} (${invUnit.code}), baseRatio: ${invUnit.baseRatio}`);

      console.log('\n🔄 换算分析：');
      console.log(`beforeQty 换算：${tx.beforeQty} ${invUnit.name} → ? ${txUnit.name}`);
      console.log(`  公式：${tx.beforeQty} × ${invUnit.baseRatio} ÷ ${txUnit.baseRatio} = ${tx.beforeQty * invUnit.baseRatio / txUnit.baseRatio}`);

      console.log(`afterQty 换算：${tx.afterQty} ${invUnit.name} → ? ${txUnit.name}`);
      console.log(`  公式：${tx.afterQty} × ${invUnit.baseRatio} ÷ ${txUnit.baseRatio} = ${tx.afterQty * invUnit.baseRatio / txUnit.baseRatio}`);
    }

    queryRunner.release();
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await dataSource.destroy();
  }
}

checkTransaction();
