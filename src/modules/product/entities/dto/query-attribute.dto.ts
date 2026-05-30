import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class QueryAttributeDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ description: '每页条数', required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  pageSize?: number = 20;

  @ApiProperty({ description: '属性名称模糊搜索', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '属性编码模糊搜索', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '状态筛选', required: false })
  @IsOptional()
  @IsNumber()
  isActive?: number;

  @ApiProperty({ description: '模板来源筛选：standard-标准模板，custom-租户自建', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['standard', 'custom'])
  templateScope?: 'standard' | 'custom';
}
