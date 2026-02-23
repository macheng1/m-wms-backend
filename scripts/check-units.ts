import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

// 加载环境变量
const envFile = resolve(process.cwd(), 'envs', `.env.${process.env.NODE_ENV || 'development'}`);
dotenv.config({ path: envFile });

async function checkUnits() {
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

    // 查询单位配置
    const units = await queryRunner.query(
      `SELECT code, name, category, baseRatio, baseUnitCode, isActive
       FROM units
       WHERE tenantId='5fe0d179-17be-40b0-89bb-e6224977ee48'
       AND code IN ('COUNT9173', 'COUNT0183', 'COUNT6162')
       ORDER BY baseRatio ASC`
    );

    console.log('单位配置信息：');
    console.log('┌────────────┬──────┬──────────┬───────────┬───────────────┬──────────┐');
    console.log('│ 编码       │ 名称 │ 分类     │ 换算比率   │ 基准单位编码  │ 状态     │');
    console.log('├────────────┼──────┼──────────┼───────────┼───────────────┼──────────┤');
    for (const unit of units) {
      console.log(`│ ${unit.code.padEnd(10)} │ ${unit.name.padEnd(4)} │ ${unit.category.padEnd(8)} │ ${String(unit.baseRatio).padEnd(9)} │ ${String(unit.baseUnitCode || '').padEnd(13)} │ ${unit.isActive === 1 ? '启用' : '禁用'} │`);
    }
    console.log('└────────────┴──────┴──────────┴───────────┴───────────────┴──────────┘');

    console.log('\n关键信息：');
    console.log(`- COUNT9173（箱）: baseRatio = ${units.find(u => u.code === 'COUNT9173').baseRatio}, baseUnitCode = ${units.find(u => u.code === 'COUNT9173').baseUnitCode || '无'}`);
    console.log(`- COUNT0183（个）: baseRatio = ${units.find(u => u.code === 'COUNT0183').baseRatio}, baseUnitCode = ${units.find(u => u.code === 'COUNT0183').baseUnitCode || '无'}`);
    console.log(`- COUNT6162（盒）: baseRatio = ${units.find(u => u.code === 'COUNT6162').baseRatio}, baseUnitCode = ${units.find(u => u.code === 'COUNT6162').baseUnitCode || '无'}`);

    // 检查它们是否属于同一分类
    const categories = [...new Set(units.map(u => u.category))];
    console.log(`\n单位分类: ${categories.join(', ')}`);

    if (categories.length > 1) {
      console.log('\n⚠️  警告：这些单位不属于同一分类，无法进行换算！');
    } else {
      console.log('\n✅ 这些单位属于同一分类，可以换算');
    }

    // 查询库存记录
    const inventory = await queryRunner.query(
      `SELECT id, sku, productName, quantity, unitId
       FROM inventory
       WHERE sku='SKU-MKPHPWIP-3069' AND tenantId='5fe0d179-17be-40b0-89bb-e6224977ee48'`
    );

    if (inventory.length > 0) {
      console.log('\n当前库存记录：');
      console.log(`- SKU: ${inventory[0].sku}`);
      console.log(`- 产品名称: ${inventory[0].productName}`);
      console.log(`- 库存数量: ${inventory[0].quantity}`);
      console.log(`- 主单位ID: ${inventory[0].unitId}`);
    }

    // 查询入库流水
    const transactions = await queryRunner.query(
      `SELECT id, transactionType, quantity, beforeQty, afterQty,
              (SELECT name FROM units WHERE id=inventory_transactions.unitId) as unitName,
              createdAt
       FROM inventory_transactions
       WHERE sku='SKU-MKPHPWIP-3069' AND tenantId='5fe0d179-17be-40b0-89bb-e6224977ee48'
       ORDER BY createdAt ASC`
    );

    console.log('\n入库流水记录：');
    console.log('┌─────────────────────┬──────────────┬──────────┬───────────┬──────────┬────────┐');
    console.log('│ 时间                │ 类型         │ 数量     │ 变动前    │ 变动后    │ 单位   │');
    console.log('├─────────────────────┼──────────────┼──────────┼───────────┼──────────┼────────┤');
    for (const tx of transactions) {
      const time = new Date(tx.createdAt).toLocaleString('zh-CN');
      console.log(`│ ${time} │ ${tx.transactionType.padEnd(12)} │ ${String(tx.quantity).padEnd(8)} │ ${String(tx.beforeQty).padEnd(9)} │ ${String(tx.afterQty).padEnd(8)} │ ${tx.unitName || ''} │`);
    }
    console.log('└─────────────────────┴──────────────┴──────────┴───────────┴──────────┴────────┘');

    queryRunner.release();
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await dataSource.destroy();
  }
}

checkUnits();
