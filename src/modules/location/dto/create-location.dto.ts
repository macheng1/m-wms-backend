import { IsEnum, IsOptional, IsNumber, IsObject, IsString } from 'class-validator';
import { LocationType, LocationStatus } from '../entities/location.entity';

/**
 * 创建库位DTO
 * 库位编码会根据 warehouse、area、shelf、level、position 自动生成
 */
export class CreateLocationDto {
  @IsOptional()
  @IsString()
  code?: string; // 库位编码（可选，不传则自动生成）

  @IsOptional()
  @IsString()
  name?: string; // 库位名称（可选，不传则自动生成）

  @IsString()
  warehouse: string; // 仓库编码

  @IsString()
  area: string; // 区域编码

  @IsString()
  @IsOptional()
  shelf?: string; // 货架号

  @IsString()
  @IsOptional()
  level?: string; // 层号

  @IsString()
  @IsOptional()
  position?: string; // 位号

  @IsEnum(LocationType)
  @IsOptional()
  type?: LocationType; // 库位类型

  @IsEnum(LocationStatus)
  @IsOptional()
  status?: LocationStatus; // 库位状态

  @IsNumber()
  @IsOptional()
  capacity?: number; // 容量限制

  @IsString()
  @IsOptional()
  capacityUnit?: string; // 容量单位

  @IsObject()
  @IsOptional()
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  @IsObject()
  @IsOptional()
  coordinates?: {
    x: number;
    y: number;
    z: number;
  };

  @IsString()
  @IsOptional()
  remark?: string;
}
