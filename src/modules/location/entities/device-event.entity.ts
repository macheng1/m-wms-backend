import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 设备事件日志表（预留硬件集成）
 */
@Entity('device_events')
@Index('device_event_tenant_device_idx', ['tenantId', 'deviceId'])
export class DeviceEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /**
   * 设备ID
   */
  @Column()
  deviceId: string;

  /**
   * 事件类型
   */
  @Column({ length: 50 })
  eventType: string;
  // 扫码事件：SCAN
  // RFID读取：TAG_READ
  // 库位变化：LOCATION_CHANGE
  // 拣货：PICK
  // 上架：PUT
  // AGV任务：AGV_TASK
  // 传感器数据：SENSOR_DATA
  // 错误：ERROR

  /**
   * 事件数据
   */
  @Column({ type: 'json' })
  eventData: {
    // 业务数据
    sku?: string;
    batchNo?: string;
    quantity?: number;
    fromLocation?: string;
    toLocation?: string;

    // 设备数据
    barcode?: string;
    rfid?: string;
    sensorType?: string;
    sensorValue?: any;

    // 位置数据
    position?: { x: number; y: number; z: number };

    // 其他数据
    [key: string]: any;
  };

  /**
   * 是否已处理
   */
  @Column({ default: false })
  processed: boolean;

  /**
   * 错误信息（如果有）
   */
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;
}
