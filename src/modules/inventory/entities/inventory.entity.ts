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
@Index('inventory_tenant_sku_idx', ['tenantId', 'sku'], { unique: true })
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

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  lockedQuantity: number;

  @Index('inventory_unit_id_idx')
  @Column({ type: 'char', length: 36, nullable: true })
  unitId: string;

  @ManyToOne(() => Unit, { eager: false })
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @Index('inventory_location_id_idx')
  @Column({ type: 'char', length: 36, nullable: true })
  locationId: string;

  // 最后一次操作的来源 / 操作人（库存列表直接展示，避免再回查流水）
  @Column({ length: 32, nullable: true })
  lastSource: string;

  @Column({ type: 'char', length: 36, nullable: true })
  lastOperatorId: string;

  @Column({ length: 100, nullable: true })
  lastOperatorName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
