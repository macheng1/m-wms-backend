import { Entity, Column, Unique } from 'typeorm';
import { TenantBaseEntity } from '../../../database/base.entity';
import { UnitCategory } from '../../../common/constants/unit.constant';

@Entity('units')
@Unique(['tenantId', 'code'])
export class Unit extends TenantBaseEntity {
  @Column({ length: 50 })
  name: string;

  @Column({ length: 20 })
  code: string;

  @Column({
    type: 'enum',
    enum: UnitCategory,
  })
  category: UnitCategory;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 1 })
  baseRatio: number;

  @Column({ length: 20 })
  baseUnitCode: string;

  @Column({ length: 20, nullable: true })
  symbol: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ type: 'int', default: 1 })
  isActive: number;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
