import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

// 加载环境变量
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
    console.log('数据库连接成功\n');

    const queryRunner = dataSource.createQueryRunner();

    // 查询最新的入库流水记录
    const transaction = await queryRunner.query(
      `SELECT
        id,
        sku,
        transactionType,
        quantity,
        beforeQty,
        afterQty,
        unitId,
        createdAt
       FROM inventory_transactions
       WHERE tenantId='5fe0d179-17be-40b0-89bb-e6224977ee48'
       ORDER BY createdAt DESC
       LIMIT 1`
    );

    if (transaction.length > 0) {
      const tx = transaction[0];
      console.log('📦 最新入库流水记录（数据库原始值）：');
      console.log('┌─────────────────────────────────────────────────────┐');
      console.log(`│ SKU:           ${tx.sku.padEnd(43)} │`);
      console.log(`│ 交易类型:      ${tx.transactionType.padEnd(43)} │`);
      console.log(`│ 入库数量:      ${String(tx.quantity).padEnd(43)} │`);
      console.log(`│ 变动前数量:    ${String(tx.beforeQty).padEnd(43)} │`);
      console.log(`│ 变动后数量:    ${String(tx.afterQty).padEnd(43)} │`);
      console.log(`│ 流水单位ID:    ${tx.unitId.padEnd(43)} │`);
      console.log('└─────────────────────────────────────────────────────┘');

      // 查询库存记录
      const inventory = await queryRunner.query(
        `SELECT id, sku, quantity, unitId
         FROM inventory
         WHERE sku='${tx.sku}' AND tenantId='5fe0d179-17be-40b0-89bb-e6224977ee48'`
      );

      if (inventory.length > 0) {
        const inv = inventory[0];
        console.log('\n📊 当前库存记录：');
        console.log('┌─────────────────────────────────────────────────────┐');
        console.log(`│ SKU:           ${inv.sku.padEnd(43)} │`);
        console.log(`│ 库存数量:      ${String(inv.quantity).padEnd(43)} │`);
        console.log(`│ 库存主单位ID:  ${inv.unitId.padEnd(43)} │`);
        console.log('└─────────────────────────────────────────────────────┘');

        // 查询单位信息
        const units = await queryRunner.query(
          `SELECT id, code, name, baseRatio, baseUnitCode
           FROM units
           WHERE id IN ('${tx.unitId}', '${inv.unitId}')
           AND tenantId='5fe0d179-17be-40b0-89bb-e6224977ee48'`
        );

        console.log('\n📏 单位信息：');
        console.log('┌────────────────────────────────────────────────────────────┐');
        console.log('│ ID                                  │ 编码      │ 名称 │ 换算比率 │');
        console.log('├────────────────────────────────────────────────────────────┤');
        for (const unit of units) {
          const isTxUnit = unit.id === tx.unitId;
          const isInvUnit = unit.id === inv.unitId;
          const mark = isTxUnit ? '流水单位' : (isInvUnit ? '库存单位' : '');
          console.log(`│ ${unit.id.padEnd(35)} │ ${unit.code.padEnd(8)} │ ${unit.name.padEnd(4)} │ ${String(unit.baseRatio).padEnd(8)} │ ${mark}`);
        }
        console.log('└────────────────────────────────────────────────────────────┘');

        // 计算换算
        const txUnit = units.find(u => u.id === tx.unitId);
        const invUnit = units.find(u => u.id === inv.unitId);

        if (txUnit && invUnit) {
          console.log('\n🔄 单位换算分析：');
          console.log(`数据库中 beforeQty (库存主单位): ${tx.beforeQty} ${invUnit.name}`);
          console.log(`数据库中 afterQty (库存主单位): ${tx.afterQty} ${invUnit.name}`);

          const beforeQtyInTxUnit = (Number(tx.beforeQty) * Number(invUnit.baseRatio)) / Number(txUnit.baseRatio);
          const afterQtyInTxUnit = (Number(tx.afterQty) * Number(invUnit.baseRatio)) / Number(txUnit.baseRatio);

          console.log(``);
          console.log(`换算前计算：${tx.beforeQty} × ${invUnit.baseRatio} ÷ ${txUnit.baseRatio} = ${beforeQtyInTxUnit} ${txUnit.name}`);
          console.log(`换算后计算：${tx.afterQty} × ${invUnit.baseRatio} ÷ ${txUnit.baseRatio} = ${afterQtyInTxUnit} ${txUnit.name}`);

          console.log(``);
          console.log(`✅ 应该显示：`);
          console.log(`   beforeQty: ${beforeQtyInTxUnit} ${txUnit.name}`);
          console.log(`   afterQty: ${afterQtyInTxUnit} ${txUnit.name}`);
        }
      }
    }

    queryRunner.release();
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await dataSource.destroy();
  }
}

checkTransaction();
