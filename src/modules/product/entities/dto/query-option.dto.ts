import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

// src/modules/attributes/dto/query-option.dto.ts
export class QueryOptionDto {
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  pageSize: number = 10;

  @ApiProperty({ description: '所属属性ID', required: false })
  @IsOptional()
  @IsString()
  attributeId?: string; // 过滤特定属性的规格

  @ApiProperty({ description: '规格值模糊搜索', required: false })
  @IsOptional()
  @IsString()
  value?: string; // 比如搜 "304"
}
