import { Column, Entity, Unique } from 'typeorm';
import { TenantBaseEntity } from '../../../database/base.entity';

@Entity('unit_conversions')
@Unique(['tenantId', 'fromUnitCode', 'toUnitCode'])
export class UnitConversion extends TenantBaseEntity {
  @Column({ length: 20 })
  fromUnitCode: string;

  @Column({ length: 20 })
  toUnitCode: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 1 })
  ratio: number;
}
