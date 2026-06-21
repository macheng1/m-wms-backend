import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductBarcode1781827300000 implements MigrationInterface {
  name = 'AddProductBarcode1781827300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const productTable = await queryRunner.getTable('products');
    const hasBarcode = productTable?.findColumnByName('barcode');
    if (!hasBarcode) {
      await queryRunner.query(
        "ALTER TABLE `products` ADD COLUMN `barcode` varchar(120) NULL COMMENT '产品条形码，默认与产品编码/SKU一致' AFTER `code`",
      );
    }

    await queryRunner.query("UPDATE `products` SET `barcode` = `code` WHERE `barcode` IS NULL OR `barcode` = ''");

    const indexes = await queryRunner.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND INDEX_NAME = 'product_tenant_barcode_unique'
      LIMIT 1
    `);
    if (!indexes.length) {
      await queryRunner.query(
        'CREATE UNIQUE INDEX `product_tenant_barcode_unique` ON `products` (`tenantId`, `barcode`)',
      );
    }

    await queryRunner.query(`
      DELETE rm FROM \`role_menus\` rm
      JOIN \`menus\` m ON m.\`id\` = rm.\`menuId\`
      WHERE m.\`code\` = 'tenant:inventory:items'
    `);
    await queryRunner.query(`
      DELETE tmp FROM \`tenant_menu_permissions\` tmp
      JOIN \`menus\` m ON m.\`id\` = tmp.\`menuId\`
      WHERE m.\`code\` = 'tenant:inventory:items'
    `);
    await queryRunner.query("DELETE FROM `menus` WHERE `code` = 'tenant:inventory:items'");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = await queryRunner.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND INDEX_NAME = 'product_tenant_barcode_unique'
      LIMIT 1
    `);
    if (indexes.length) {
      await queryRunner.query('DROP INDEX `product_tenant_barcode_unique` ON `products`');
    }

    const productTable = await queryRunner.getTable('products');
    const hasBarcode = productTable?.findColumnByName('barcode');
    if (hasBarcode) {
      await queryRunner.query('ALTER TABLE `products` DROP COLUMN `barcode`');
    }
  }
}
