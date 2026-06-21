import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * orders 表新增 stockLocked 标记位，用于订单库存动作的幂等：
 *   - 1：订单当前持有锁定库存（已锁、待扣减或待释放）
 *   - 0：未锁 / 已扣减 / 已释放
 *
 * 回填：存量小程序订单在创建时即锁库（旧逻辑在 COMPLETED 扣减、在取消/驳回释放），
 * 因此当前状态不在 COMPLETED/CANCELLED/REJECTED 的小程序单仍持有锁定库存，回填为 1。
 * admin/website 旧订单从不锁库，保持默认 0。
 */
export class AddOrderStockLocked1782100000000 implements MigrationInterface {
  name = 'AddOrderStockLocked1782100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');
    const hasColumn = table?.findColumnByName('stockLocked');
    if (!hasColumn) {
      await queryRunner.query(
        "ALTER TABLE `orders` ADD COLUMN `stockLocked` tinyint NOT NULL DEFAULT 0 COMMENT '是否持有锁定库存：1=已锁，0=未锁/已扣/已释放' AFTER `status`",
      );
    }

    await queryRunner.query(`
      UPDATE \`orders\`
      SET \`stockLocked\` = 1
      WHERE \`source\` = 'MINIAPP'
        AND \`status\` NOT IN ('COMPLETED', 'CANCELLED', 'REJECTED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');
    const hasColumn = table?.findColumnByName('stockLocked');
    if (hasColumn) {
      await queryRunner.query('ALTER TABLE `orders` DROP COLUMN `stockLocked`');
    }
  }
}
