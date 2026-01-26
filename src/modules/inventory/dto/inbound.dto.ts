import { IsString, IsNumber, IsNotEmpty, IsOptional, IsEnum, IsArray, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { TransactionType } from '../../../common/constants/unit.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class InboundItemDto {
  @ApiProperty({
    description: '产品编码/SKU（从 /api/products/select 接口获取 value）',
    example: 'SKU-XXX',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: '入库数量', example: 100 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: '单位编码', example: 'PIECE' })
  @IsString()
  @IsNotEmpty()
  unitCode: string;
}

export class InboundDto {
  @ApiProperty({
    description: '产品编码/SKU（从 /api/products/select 接口获取 value）',
    example: 'SKU-XXX',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: '入库数量', example: 100 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: '单位编码', example: 'PIECE' })
  @IsString()
  @IsNotEmpty()
  unitCode: string;

  @ApiPropertyOptional({ description: '订单号', example: 'PO-20240101-001' })
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
    example: 'INBOUND_PURCHASE',
  })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiPropertyOptional({ description: '备注', example: '采购入库' })
  @IsString()
  @IsOptional()
  remark?: string;
}

export class BatchInboundDto {
  @ApiPropertyOptional({ description: '订单号', example: 'PO-20240101-001' })
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
    example: 'INBOUND_PURCHASE',
  })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiPropertyOptional({ description: '备注', example: '批量入库' })
  @IsString()
  @IsOptional()
  remark?: string;

  @ApiProperty({
    description: '入库明细列表',
    type: [InboundItemDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => InboundItemDto)
  items: InboundItemDto[];
}
