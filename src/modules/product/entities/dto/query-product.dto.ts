import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class QueryProductDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) pageSize?: number = 20;

  @ApiProperty({ description: '产品名称或编码模糊查询', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '类目筛选', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: '状态筛选', required: false })
  @IsOptional()
  @Type(() => Number)
  isActive?: number;
}
