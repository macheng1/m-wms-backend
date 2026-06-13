import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUnitConversions1781913600000 implements MigrationInterface {
  name = 'CreateUnitConversions1781913600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const unitsTable = await queryRunner.getTable('units');
    const categoryColumn = unitsTable?.findColumnByName('category');
    if (categoryColumn) {
      await queryRunner.query(`
        ALTER TABLE \`units\`
        MODIFY COLUMN \`category\` enum('COUNT','WEIGHT','LENGTH','VOLUME','AREA','TIME') NOT NULL DEFAULT 'COUNT'
      `);
    }

    const table = await queryRunner.getTable('unit_conversions');
    if (!table) {
      await queryRunner.query(`
        CREATE TABLE \`unit_conversions\` (
          \`id\` varchar(36) NOT NULL,
          \`tenantId\` varchar(36) NULL,
          \`fromUnitCode\` varchar(20) NOT NULL,
          \`toUnitCode\` varchar(20) NOT NULL,
          \`ratio\` decimal(15,4) NOT NULL DEFAULT 1,
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deletedAt\` datetime(6) NULL,
          UNIQUE INDEX \`unit_conversion_tenant_from_to_unique\` (\`tenantId\`, \`fromUnitCode\`, \`toUnitCode\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('unit_conversions');
    if (table) {
      await queryRunner.query('DROP TABLE `unit_conversions`');
    }

    const unitsTable = await queryRunner.getTable('units');
    const categoryColumn = unitsTable?.findColumnByName('category');
    if (categoryColumn) {
      await queryRunner.query(`
        ALTER TABLE \`units\`
        MODIFY COLUMN \`category\` enum('COUNT','WEIGHT','LENGTH','VOLUME','AREA','TIME') NOT NULL
      `);
    }
  }
}
