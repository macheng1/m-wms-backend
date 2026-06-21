import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PublicProductPageDto {
  @ApiProperty({ description: '租户ID' })
  @IsString()
  tenantId: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数，最大 100', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '产品名称或编码关键字' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '类目ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class PublicProductDetailDto {
  @ApiProperty({ description: '租户ID' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: '产品ID' })
  @IsString()
  id: string;
}
