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
import { Location } from './location.entity';

/**
 * 库存明细表（库位维度）
 * 记录每个SKU在每个库位的库存数量
 * 支持同一SKU在多个库位有库存
 */
@Entity('inventory_locations')
@Index('inv_loc_tenant_sku_idx', ['tenantId', 'sku'])
@Index('inv_loc_tenant_location_idx', ['tenantId', 'locationId'])
export class InventoryLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /**
   * SKU（产品编码）
   */
  @Column({ length: 100 })
  sku: string;

  /**
   * 产品名称（冗余字段，方便查询）
   */
  @Column({ length: 200 })
  productName: string;

  /**
   * 库位ID
   */
  @Index('inv_loc_location_id_idx')
  @Column()
  locationId: string;

  @ManyToOne(() => Location, { eager: false })
  @JoinColumn({ name: 'locationId' })
  location: Location;

  /**
   * 库存数量
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  quantity: number;

  /**
   * 单位ID
   */
  @Column({ nullable: true })
  unitId: string;

  /**
   * 批次号（可选）
   * 支持批次管理
   */
  @Column({ length: 50, nullable: true })
  batchNo: string;

  /**
   * 生产日期
   */
  @Column({ type: 'date', nullable: true })
  productionDate: Date;

  /**
   * 过期日期
   */
  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  /**
   * 库位锁定数量（预留）
   * 用于订单锁定、拣货锁定等
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  lockedQuantity: number;

  /**
   * 实时数据（预留硬件集成）
   * 由硬件设备（RFID、传感器等）实时更新
   */
  @Column({ type: 'json', nullable: true })
  realtimeData: {
    lastUpdate?: Date;
    dataSource?: string; // MANUAL, RFID, SENSOR, AGV
    deviceIds?: string[]; // 数据来源设备
    sensorData?: {
      temperature?: number;
      humidity?: number;
      weight?: number;
    };
  };

  /**
   * 扩展属性
   */
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
