import { IsString, IsNumber, IsNotEmpty, IsOptional, IsEnum, IsArray, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { TransactionType } from '../../../common/constants/unit.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OutboundItemDto {
  @ApiProperty({
    description: '产品编码/SKU（从 /api/products/select 接口获取 value）',
    example: 'SKU-XXX',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: '出库数量', example: 50 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}

export class OutboundDto {
  @ApiProperty({
    description: '产品编码/SKU（从 /api/products/select 接口获取 value）',
    example: 'SKU-XXX',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: '出库数量', example: 50 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ description: '单位编码（不传则使用库存默认单位）', example: 'PIECE' })
  @IsString()
  @IsOptional()
  unitCode?: string;

  @ApiPropertyOptional({ description: '订单号', example: 'SO-20240101-001' })
  @IsString()
  @IsOptional()
  orderNo?: string;

  @ApiPropertyOptional({
    description: '库位ID（从 /api/locations/available-for-selection 接口获取 value）',
    example: 'location-uuid-001',
  })
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiProperty({
    description: '交易类型',
    enum: TransactionType,
    example: 'OUTBOUND_SALES',
  })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiPropertyOptional({ description: '备注', example: '销售出库' })
  @IsString()
  @IsOptional()
  remark?: string;
}

export class BatchOutboundDto {
  @ApiPropertyOptional({ description: '订单号', example: 'SO-20240101-001' })
  @IsString()
  @IsOptional()
  orderNo?: string;

  @ApiPropertyOptional({
    description: '库位ID（从 /api/locations/available-for-selection 接口获取 value）',
    example: 'location-uuid-001',
  })
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiProperty({
    description: '交易类型',
    enum: TransactionType,
    example: 'OUTBOUND_SALES',
  })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiPropertyOptional({ description: '备注', example: '批量出库' })
  @IsString()
  @IsOptional()
  remark?: string;

  @ApiProperty({
    description: '出库明细列表',
    type: [OutboundItemDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OutboundItemDto)
  items: OutboundItemDto[];
}
