import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * 设备类型枚举
 */
export enum DeviceType {
  SCANNER = 'SCANNER', // 扫码枪/扫码器
  RFID_READER = 'RFID_READER', // RFID读头
  RFID_TAG = 'RFID_TAG', // RFID标签
  AGV = 'AGV', // AGV小车
  ESL = 'ESL', // 电子标签
  SENSOR = 'SENSOR', // 传感器（温湿度、重量等）
  PRINTER = 'PRINTER', // 打印机
  GATE = 'GATE', // 道闸/门禁
  CAMERA = 'CAMERA', // 摄像头
  PDA = 'PDA', // 手持终端
}

/**
 * 设备状态枚举
 */
export enum DeviceStatus {
  ONLINE = 'ONLINE', // 在线
  OFFLINE = 'OFFLINE', // 离线
  ERROR = 'ERROR', // 故障
  MAINTENANCE = 'MAINTENANCE', // 维护中
  DISABLED = 'DISABLED', // 已禁用
}

/**
 * 设备表（预留硬件集成）
 */
@Entity('devices')
@Index('device_tenant_code_idx', ['tenantId', 'code'])
@Unique(['tenantId', 'code'])
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /**
   * 设备编号（租户内唯一）
   */
  @Column({ length: 50 })
  code: string;

  /**
   * 设备名称
   */
  @Column({ length: 100 })
  name: string;

  /**
   * 设备类型
   */
  @Column({
    type: 'enum',
    enum: DeviceType,
  })
  type: DeviceType;

  /**
   * 设备状态
   */
  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.OFFLINE,
  })
  status: DeviceStatus;

  /**
   * 绑定的库位ID（可选）
   * 固定安装的设备需要绑定库位，如RFID读头、电子标签等
   */
  @Column({ nullable: true })
  locationId: string;

  /**
   * 设备配置（预留硬件集成）
   * 存储设备的连接信息、协议配置等
   */
  @Column({ type: 'json', nullable: true })
  config: {
    // 网络配置
    ip?: string;
    port?: number;
    protocol?: string; // HTTP, MQTT, TCP, Serial, WebSocket等

    // 认证信息
    apiKey?: string;
    username?: string;
    password?: string;

    // 设备特定配置
    rfidFrequency?: string; // RFID频率
    scannerType?: string; // 扫码类型
    agvSpeed?: number; // AGV速度

    // 回调配置
    webhookUrl?: string;
    callbackConfig?: Record<string, any>;
  };

  /**
   * 最后心跳时间（用于判断设备在线状态）
   */
  @Column({ type: 'datetime', nullable: true })
  lastHeartbeat: Date;

  /**
   * 扩展属性
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
