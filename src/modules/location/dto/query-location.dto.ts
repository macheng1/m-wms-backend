import { IsOptional, IsString, IsEnum } from 'class-validator';
import { LocationType, LocationStatus } from '../entities/location.entity';

/**
 * 查询库位DTO
 */
export class QueryLocationDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  warehouse?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @IsOptional()
  @IsEnum(LocationStatus)
  status?: LocationStatus;

  @IsOptional()
  @IsString()
  keyword?: string; // 模糊查询 code 或 name
}
