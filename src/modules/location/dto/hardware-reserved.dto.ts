import { IsString, IsObject, IsArray, IsOptional, IsNumber } from 'class-validator';

/**
 * 扫码数据上报DTO（预留硬件集成）
 */
export class ScanDataDto {
  @IsString()
  deviceCode: string; // 设备编号

  @IsString()
  barcode: string; // 条码内容

  @IsString()
  @IsOptional()
  location?: string; // 库位编码（如果有）

  @IsString()
  @IsOptional()
  action?: string; // 动作类型：INBOUND, OUTBOUND, TRANSFER

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>; // 扩展数据
}

/**
 * RFID读取DTO（预留硬件集成）
 */
export class RfidReadDto {
  @IsString()
  readerId: string; // RFID读头ID

  @IsString()
  @IsOptional()
  location?: string; // 库位编码（如果有）

  @IsArray()
  tags: string[]; // RFID标签列表

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 传感器数据上报DTO（预留硬件集成）
 */
export class SensorDataDto {
  @IsString()
  deviceId: string; // 设备ID

  @IsString()
  sensorType: string; // 传感器类型：TEMPERATURE, HUMIDITY, WEIGHT等

  @IsObject()
  data: {
    value: number;
    unit?: string;
    timestamp?: Date;
  };

  @IsString()
  @IsOptional()
  location?: string; // 库位编码（如果有）
}

/**
 * 设备心跳DTO（预留硬件集成）
 */
export class DeviceHeartbeatDto {
  @IsString()
  deviceCode: string; // 设备编号

  @IsObject()
  @IsOptional()
  status?: {
    battery?: number; // 电量（百分比）
    signal?: number; // 信号强度
    errors?: string[]; // 错误列表
    [key: string]: any;
  };
}

/**
 * AGV任务DTO（预留硬件集成）
 */
export class AgvTaskDto {
  @IsString()
  fromLocation: string; // 起始库位

  @IsString()
  toLocation: string; // 目标库位

  @IsString()
  sku: string; // SKU

  @IsNumber()
  quantity: number; // 数量

  @IsString()
  @IsOptional()
  priority?: string; // 优先级：HIGH, MEDIUM, LOW

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 库位实时数据DTO（预留硬件集成）
 */
export interface LocationRealtimeData {
  locationId: string;
  locationCode: string;
  sku?: string;
  quantity?: number;
  lastUpdate?: Date;
  dataSource?: 'MANUAL' | 'RFID' | 'SENSOR' | 'AGV';
  deviceIds?: string[];
  sensorData?: {
    temperature?: number;
    humidity?: number;
    weight?: number;
  };
}
