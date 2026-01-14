import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';

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
}
