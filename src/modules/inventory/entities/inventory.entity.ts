import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Unit } from '../../unit/entities/unit.entity';

@Entity('inventory')
@Index('inventory_tenant_sku_idx', ['tenantId', 'sku'])
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ length: 100 })
  sku: string;

  @Column({ length: 200 })
  productName: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  quantity: number;

  @Index('inventory_unit_id_idx')
  @Column({ nullable: true })
  unitId: string;

  @ManyToOne(() => Unit, { eager: false })
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @Column({ length: 100, nullable: true })
  location: string;

  @Column({ type: 'json', nullable: true })
  multiUnitQty: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
