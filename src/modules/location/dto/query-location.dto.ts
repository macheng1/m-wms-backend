import { IsOptional, IsString, IsEnum } from 'class-validator';
import { LocationType, LocationStatus } from '../entities/location.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 查询库位DTO
 */
export class QueryLocationDto {
  @ApiPropertyOptional({ description: '库位编码' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: '仓库编码' })
  @IsOptional()
  @IsString()
  warehouse?: string;

  @ApiPropertyOptional({ description: '区域编码' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ description: '库位类型', enum: LocationType })
  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @ApiPropertyOptional({ description: '库位状态', enum: LocationStatus })
  @IsOptional()
  @IsEnum(LocationStatus)
  status?: LocationStatus;

  @ApiPropertyOptional({ description: '关键字，模糊匹配库位编码或名称' })
  @IsOptional()
  @IsString()
  keyword?: string; // 模糊查询 code 或 name
}
