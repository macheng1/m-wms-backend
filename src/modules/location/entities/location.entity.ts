import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 库位类型枚举
 */
export enum LocationType {
  STORAGE = 'STORAGE',       // 存储区
  PICKING = 'PICKING',       // 拣货区
  TEMP = 'TEMP',             // 暂存区
  RECEIVING = 'RECEIVING',   // 收货区
  SHIPPING = 'SHIPPING',     // 发货区
  DEFECT = 'DEFECT',         // 次品区
  RETURN = 'RETURN',         // 退货区
}

/**
 * 库位状态枚举
 */
export enum LocationStatus {
  AVAILABLE = 'AVAILABLE',   // 可用
  OCCUPIED = 'OCCUPIED',     // 已占用
  LOCKED = 'LOCKED',         // 锁定
  RESERVED = 'RESERVED',     // 预留
  DISABLED = 'DISABLED',     // 禁用
}

@Entity('locations')
@Index('location_tenant_code_idx', ['tenantId', 'code'])
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /**
   * 库位编码
   * 格式：仓库-区域-货架-层-位
   * 例如：A01-01-01-03
   */
  @Column({ unique: true, length: 50 })
  code: string;

  /**
   * 库位名称
   */
  @Column({ length: 100 })
  name: string;

  /**
   * 仓库编码
   */
  @Column({ length: 20 })
  warehouse: string;

  /**
   * 区域编码
   */
  @Column({ length: 20 })
  area: string;

  /**
   * 货架号
   */
  @Column({ length: 20, nullable: true })
  shelf: string;

  /**
   * 层号
   */
  @Column({ length: 20, nullable: true })
  level: string;

  /**
   * 位号
   */
  @Column({ length: 20, nullable: true })
  position: string;

  /**
   * 库位类型
   */
  @Column({
    type: 'enum',
    enum: LocationType,
    default: LocationType.STORAGE,
  })
  type: LocationType;

  /**
   * 库位状态
   */
  @Column({
    type: 'enum',
    enum: LocationStatus,
    default: LocationStatus.AVAILABLE,
  })
  status: LocationStatus;

  /**
   * 容量限制（可选）
   * 可以是重量(kg)、体积(m³)、数量等
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  capacity: number;

  /**
   * 容量单位
   */
  @Column({ length: 20, nullable: true })
  capacityUnit: string;

  /**
   * 库位尺寸（预留硬件集成）
   * 用于AGV路径规划、空间计算等
   */
  @Column({ type: 'json', nullable: true })
  dimensions: {
    length: number;  // 长 (cm)
    width: number;   // 宽 (cm)
    height: number;  // 高 (cm)
  };

  /**
   * 物理坐标（预留硬件集成）
   * 用于AGV导航、可视化等
   */
  @Column({ type: 'json', nullable: true })
  coordinates: {
    x: number;  // X坐标
    y: number;  // Y坐标
    z: number;  // Z坐标（层高）
  };

  /**
   * 绑定的设备ID列表（预留硬件集成）
   * 例如：RFID读头、电子标签、传感器等
   */
  @Column({ type: 'json', nullable: true })
  deviceIds: string[];

  /**
   * 扩展属性（预留扩展）
   */
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  /**
   * 备注
   */
  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
