import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class DropLegacyUnitInventoryFields1781913700000 implements MigrationInterface {
  name = 'DropLegacyUnitInventoryFields1781913700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('units', 'baseRatio')) {
      await queryRunner.dropColumn('units', 'baseRatio');
    }

    if (await queryRunner.hasColumn('units', 'baseUnitCode')) {
      await queryRunner.dropColumn('units', 'baseUnitCode');
    }

    if (await queryRunner.hasColumn('inventory', 'multiUnitQty')) {
      await queryRunner.dropColumn('inventory', 'multiUnitQty');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('units', 'baseRatio'))) {
      await queryRunner.addColumn(
        'units',
        new TableColumn({
          name: 'baseRatio',
          type: 'decimal',
          precision: 15,
          scale: 2,
          default: 1,
        }),
      );
    }

    if (!(await queryRunner.hasColumn('units', 'baseUnitCode'))) {
      await queryRunner.addColumn(
        'units',
        new TableColumn({
          name: 'baseUnitCode',
          type: 'varchar',
          length: '20',
          default: "''",
        }),
      );
    }

    if (!(await queryRunner.hasColumn('inventory', 'multiUnitQty'))) {
      await queryRunner.addColumn(
        'inventory',
        new TableColumn({
          name: 'multiUnitQty',
          type: 'json',
          isNullable: true,
        }),
      );
    }
  }
}
