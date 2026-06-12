import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderSource, OrderStatus, OrderType } from '../entities/order.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiPropertyOptional({ description: '产品ID', example: 'product-uuid' })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: '产品SKU', example: 'SKU-001' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ description: '产品名称', example: '不锈钢引出棒' })
  @IsString()
  @MaxLength(120)
  productName: string;

  @ApiProperty({ description: '订购数量', example: 10, default: 1, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: '单位编码', example: 'PIECE', default: 'PIECE' })
  @IsString()
  @IsOptional()
  unitCode?: string;

  @ApiPropertyOptional({ description: '单位名称', example: '支', default: '支' })
  @IsString()
  @IsOptional()
  unitName?: string;

  @ApiPropertyOptional({ description: '单价', example: 12.5, default: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: '定制需求说明', example: '按图纸加工，表面抛光' })
  @IsString()
  @IsOptional()
  customRequirement?: string;

  @ApiPropertyOptional({
    description: '图纸或附件 URL 列表',
    type: [String],
    example: ['https://example.com/drawing-001.pdf'],
    default: [],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  drawingUrls?: string[];
}

export class CreateOrderDto {
  @ApiPropertyOptional({
    description: '订单编号，不传则由后端生成',
    example: 'SO-20260612-0001',
  })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  orderNumber: string;

  @ApiPropertyOptional({
    description: '订单来源',
    enum: OrderSource,
    example: OrderSource.ADMIN,
    default: OrderSource.ADMIN,
  })
  @IsEnum(OrderSource)
  @IsOptional()
  source?: OrderSource;

  @ApiPropertyOptional({
    description: '订单类型',
    enum: OrderType,
    example: OrderType.STANDARD,
    default: OrderType.STANDARD,
  })
  @IsEnum(OrderType)
  @IsOptional()
  orderType?: OrderType;

  @ApiPropertyOptional({
    description: '订单状态',
    enum: OrderStatus,
    example: OrderStatus.PENDING_CONFIRM,
    default: OrderStatus.PENDING_CONFIRM,
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ description: '客户名称', example: '张三' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ description: '客户手机号', example: '13800138000' })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional({ description: '客户邮箱', example: 'buyer@example.com' })
  @IsString()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({ description: '客户地址', example: '江苏省泰州市海陵区' })
  @IsString()
  @IsOptional()
  customerAddress?: string;

  @ApiPropertyOptional({ description: '订单总金额', example: 1250, default: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({ description: '订单备注', example: '客户要求尽快发货' })
  @IsString()
  @IsOptional()
  remark?: string;

  @ApiPropertyOptional({
    description: '期望交付日期',
    example: '2026-06-30',
    default: '2026-06-30',
  })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({
    description: '订单明细',
    type: [CreateOrderItemDto],
    default: [],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsOptional()
  items?: CreateOrderItemDto[];
}
