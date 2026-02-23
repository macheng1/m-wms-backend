import { IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建库存记录 DTO
 * 注意：通常不需要直接创建库存记录，入库操作会自动创建
 */
export class CreateInventoryDto {
  @ApiProperty({
    description: '产品编码/SKU（从 /api/products/select 接口获取 value）',
    example: 'SKU-XXX',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  sku: string;

  @ApiProperty({
    description: '产品名称',
    example: '产品A',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  productName: string;

  @ApiProperty({
    description: '库存数量',
    example: 100,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({
    description: '库位',
    example: 'A-01-01',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  location?: string;
}
