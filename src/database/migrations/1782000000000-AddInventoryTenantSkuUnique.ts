import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 将 inventory 表的 (tenantId, sku) 索引升级为唯一索引。
 *
 * 背景：原 `inventory_tenant_sku_idx` 为非唯一索引，并发首次入库时两个请求都查不到库存记录、
 * 各自 create，会产生同一 (租户, SKU) 的重复库存行，导致库存“分裂”。
 *
 * up：
 *   1. 先合并历史重复行——把同一 (tenantId, sku) 的多行 quantity / lockedQuantity 汇总到保留行
 *      （保留每组 id 最小的一行），删除其余重复行；
 *   2. 删除旧的非唯一索引，建立同名唯一索引。
 *
 * 注意：down 只能还原索引，无法恢复被合并删除的重复行（合并是不可逆的数据修复）。
 */
export class AddInventoryTenantSkuUnique1782000000000 implements MigrationInterface {
  name = 'AddInventoryTenantSkuUnique1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 合并历史重复行 -------------------------------------------------------
    // 1.1 计算每个重复组的保留行(keepId)与汇总数量
    await queryRunner.query('DROP TEMPORARY TABLE IF EXISTS `_inv_dedup`');
    await queryRunner.query(`
      CREATE TEMPORARY TABLE \`_inv_dedup\` AS
      SELECT
        \`tenantId\`,
        \`sku\`,
        MIN(\`id\`) AS \`keepId\`,
        SUM(\`quantity\`) AS \`totalQty\`,
        SUM(\`lockedQuantity\`) AS \`totalLocked\`
      FROM \`inventory\`
      GROUP BY \`tenantId\`, \`sku\`
      HAVING COUNT(*) > 1
    `);

    // 1.2 把汇总数量写回保留行
    await queryRunner.query(`
      UPDATE \`inventory\` inv
      JOIN \`_inv_dedup\` d ON d.\`keepId\` = inv.\`id\`
      SET inv.\`quantity\` = d.\`totalQty\`,
          inv.\`lockedQuantity\` = d.\`totalLocked\`
    `);

    // 1.3 删除每组中除保留行以外的重复行
    await queryRunner.query(`
      DELETE inv FROM \`inventory\` inv
      JOIN \`_inv_dedup\` d
        ON d.\`tenantId\` = inv.\`tenantId\`
       AND d.\`sku\` = inv.\`sku\`
      WHERE inv.\`id\` <> d.\`keepId\`
    `);

    await queryRunner.query('DROP TEMPORARY TABLE IF EXISTS `_inv_dedup`');

    // 2. 索引升级为唯一 -------------------------------------------------------
    // 2.1 删除旧的非唯一索引(若存在)
    const oldIdx = await queryRunner.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'inventory'
        AND INDEX_NAME = 'inventory_tenant_sku_idx'
      LIMIT 1
    `);
    if (oldIdx.length) {
      await queryRunner.query('DROP INDEX `inventory_tenant_sku_idx` ON `inventory`');
    }

    // 2.2 建立唯一索引(若同名索引已不存在)
    const newIdx = await queryRunner.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'inventory'
        AND INDEX_NAME = 'inventory_tenant_sku_idx'
      LIMIT 1
    `);
    if (!newIdx.length) {
      await queryRunner.query(
        'CREATE UNIQUE INDEX `inventory_tenant_sku_idx` ON `inventory` (`tenantId`, `sku`)',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 仅还原索引为非唯一；已合并删除的重复行无法恢复。
    const idx = await queryRunner.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'inventory'
        AND INDEX_NAME = 'inventory_tenant_sku_idx'
      LIMIT 1
    `);
    if (idx.length) {
      await queryRunner.query('DROP INDEX `inventory_tenant_sku_idx` ON `inventory`');
    }
    await queryRunner.query(
      'CREATE INDEX `inventory_tenant_sku_idx` ON `inventory` (`tenantId`, `sku`)',
    );
  }
}
