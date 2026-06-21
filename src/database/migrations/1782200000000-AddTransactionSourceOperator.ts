import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 出入库/库存流水增加「来源 + 操作人」追溯字段：
 *   - inventory_transactions：每条流水记录本次操作的来源与操作人（快照）。
 *   - inventory：冗余记录该 SKU「最后一次」操作的来源与操作人，供库存列表直接展示。
 *
 * source 取值与各端 x-source-type 头一致：admin-web（后台）/ miniapp（小程序）/ app（手机）。
 * operatorName 为操作时的用户名快照，避免用户改名后历史记录跟着变。
 */
export class AddTransactionSourceOperator1782200000000
  implements MigrationInterface
{
  name = 'AddTransactionSourceOperator1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const txTable = await queryRunner.getTable('inventory_transactions');
    if (!txTable?.findColumnByName('source')) {
      await queryRunner.query(
        "ALTER TABLE `inventory_transactions` ADD COLUMN `source` varchar(32) NULL COMMENT '操作来源：admin-web/miniapp/app' AFTER `remark`",
      );
    }
    if (!txTable?.findColumnByName('operatorId')) {
      await queryRunner.query(
        "ALTER TABLE `inventory_transactions` ADD COLUMN `operatorId` char(36) NULL COMMENT '操作人用户ID' AFTER `source`",
      );
    }
    if (!txTable?.findColumnByName('operatorName')) {
      await queryRunner.query(
        "ALTER TABLE `inventory_transactions` ADD COLUMN `operatorName` varchar(100) NULL COMMENT '操作人用户名（快照）' AFTER `operatorId`",
      );
    }

    const invTable = await queryRunner.getTable('inventory');
    if (!invTable?.findColumnByName('lastSource')) {
      await queryRunner.query(
        "ALTER TABLE `inventory` ADD COLUMN `lastSource` varchar(32) NULL COMMENT '最后一次操作来源' AFTER `locationId`",
      );
    }
    if (!invTable?.findColumnByName('lastOperatorId')) {
      await queryRunner.query(
        "ALTER TABLE `inventory` ADD COLUMN `lastOperatorId` char(36) NULL COMMENT '最后一次操作人用户ID' AFTER `lastSource`",
      );
    }
    if (!invTable?.findColumnByName('lastOperatorName')) {
      await queryRunner.query(
        "ALTER TABLE `inventory` ADD COLUMN `lastOperatorName` varchar(100) NULL COMMENT '最后一次操作人用户名（快照）' AFTER `lastOperatorId`",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const invTable = await queryRunner.getTable('inventory');
    for (const col of ['lastOperatorName', 'lastOperatorId', 'lastSource']) {
      if (invTable?.findColumnByName(col)) {
        await queryRunner.query(`ALTER TABLE \`inventory\` DROP COLUMN \`${col}\``);
      }
    }
    const txTable = await queryRunner.getTable('inventory_transactions');
    for (const col of ['operatorName', 'operatorId', 'source']) {
      if (txTable?.findColumnByName(col)) {
        await queryRunner.query(
          `ALTER TABLE \`inventory_transactions\` DROP COLUMN \`${col}\``,
        );
      }
    }
  }
}
