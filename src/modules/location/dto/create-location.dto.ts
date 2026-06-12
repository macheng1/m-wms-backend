import { IsEnum, IsOptional, IsNumber, IsObject, IsString } from 'class-validator';
import { LocationType, LocationStatus } from '../entities/location.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建库位DTO
 * 库位编码会根据 warehouse、area、shelf、level、position 自动生成
 */
export class CreateLocationDto {
  @ApiPropertyOptional({ description: '库位编码，不传则自动生成' })
  @IsOptional()
  @IsString()
  code?: string; // 库位编码（可选，不传则自动生成）

  @ApiPropertyOptional({ description: '库位名称，不传则自动生成' })
  @IsOptional()
  @IsString()
  name?: string; // 库位名称（可选，不传则自动生成）

  @ApiProperty({ description: '仓库编码', example: 'WH-A' })
  @IsString()
  warehouse: string; // 仓库编码

  @ApiProperty({ description: '区域编码', example: 'A01' })
  @IsString()
  area: string; // 区域编码

  @ApiPropertyOptional({ description: '货架号', example: 'S01' })
  @IsString()
  @IsOptional()
  shelf?: string; // 货架号

  @ApiPropertyOptional({ description: '层号', example: 'L01' })
  @IsString()
  @IsOptional()
  level?: string; // 层号

  @ApiPropertyOptional({ description: '位号', example: 'P01' })
  @IsString()
  @IsOptional()
  position?: string; // 位号

  @ApiPropertyOptional({ description: '库位类型', enum: LocationType })
  @IsEnum(LocationType)
  @IsOptional()
  type?: LocationType; // 库位类型

  @ApiPropertyOptional({ description: '库位状态', enum: LocationStatus })
  @IsEnum(LocationStatus)
  @IsOptional()
  status?: LocationStatus; // 库位状态

  @ApiPropertyOptional({ description: '容量限制', example: 100 })
  @IsNumber()
  @IsOptional()
  capacity?: number; // 容量限制

  @ApiPropertyOptional({ description: '容量单位', example: '箱' })
  @IsString()
  @IsOptional()
  capacityUnit?: string; // 容量单位

  @ApiPropertyOptional({
    description: '库位尺寸',
    type: 'object',
    properties: {
      length: { type: 'number', description: '长' },
      width: { type: 'number', description: '宽' },
      height: { type: 'number', description: '高' },
    },
  })
  @IsObject()
  @IsOptional()
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  @ApiPropertyOptional({
    description: '可视化坐标',
    type: 'object',
    properties: {
      x: { type: 'number', description: 'X 坐标' },
      y: { type: 'number', description: 'Y 坐标' },
      z: { type: 'number', description: 'Z 坐标' },
    },
  })
  @IsObject()
  @IsOptional()
  coordinates?: {
    x: number;
    y: number;
    z: number;
  };

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  remark?: string;
}
