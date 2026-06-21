import { IsString, IsObject, IsArray, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 扫码数据上报DTO（预留硬件集成）
 */
export class ScanDataDto {
  @ApiProperty({ description: '设备编号' })
  @IsString()
  deviceCode: string; // 设备编号

  @ApiProperty({ description: '条码内容' })
  @IsString()
  barcode: string; // 条码内容

  @ApiPropertyOptional({ description: '库位编码' })
  @IsString()
  @IsOptional()
  location?: string; // 库位编码（如果有）

  @ApiPropertyOptional({ description: '动作类型', example: 'INBOUND' })
  @IsString()
  @IsOptional()
  action?: string; // 动作类型：INBOUND, OUTBOUND, TRANSFER

  @ApiPropertyOptional({ description: '扩展数据', type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>; // 扩展数据
}

/**
 * RFID读取DTO（预留硬件集成）
 */
export class RfidReadDto {
  @ApiProperty({ description: 'RFID 读头ID' })
  @IsString()
  readerId: string; // RFID读头ID

  @ApiPropertyOptional({ description: '库位编码' })
  @IsString()
  @IsOptional()
  location?: string; // 库位编码（如果有）

  @ApiProperty({ description: 'RFID 标签列表', type: [String] })
  @IsArray()
  tags: string[]; // RFID标签列表

  @ApiPropertyOptional({ description: '扩展数据', type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 传感器数据上报DTO（预留硬件集成）
 */
export class SensorDataDto {
  @ApiProperty({ description: '设备ID' })
  @IsString()
  deviceId: string; // 设备ID

  @ApiProperty({ description: '传感器类型', example: 'TEMPERATURE' })
  @IsString()
  sensorType: string; // 传感器类型：TEMPERATURE, HUMIDITY, WEIGHT等

  @ApiProperty({
    description: '传感器数据',
    type: 'object',
    properties: {
      value: { type: 'number', description: '数值' },
      unit: { type: 'string', description: '单位' },
      timestamp: { type: 'string', format: 'date-time', description: '采集时间' },
    },
  })
  @IsObject()
  data: {
    value: number;
    unit?: string;
    timestamp?: Date;
  };

  @ApiPropertyOptional({ description: '库位编码' })
  @IsString()
  @IsOptional()
  location?: string; // 库位编码（如果有）
}

/**
 * 设备心跳DTO（预留硬件集成）
 */
export class DeviceHeartbeatDto {
  @ApiProperty({ description: '设备编号' })
  @IsString()
  deviceCode: string; // 设备编号

  @ApiPropertyOptional({
    description: '设备状态',
    type: 'object',
    properties: {
      battery: { type: 'number', description: '电量百分比' },
      signal: { type: 'number', description: '信号强度' },
      errors: { type: 'array', items: { type: 'string' }, description: '错误列表' },
    },
  })
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
  @ApiProperty({ description: '起始库位编码' })
  @IsString()
  fromLocation: string; // 起始库位

  @ApiProperty({ description: '目标库位编码' })
  @IsString()
  toLocation: string; // 目标库位

  @ApiProperty({ description: '产品 SKU' })
  @IsString()
  sku: string; // SKU

  @ApiProperty({ description: '搬运数量', example: 10 })
  @IsNumber()
  quantity: number; // 数量

  @ApiPropertyOptional({ description: '任务优先级', example: 'HIGH' })
  @IsString()
  @IsOptional()
  priority?: string; // 优先级：HIGH, MEDIUM, LOW

  @ApiPropertyOptional({ description: '扩展数据', type: Object })
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
