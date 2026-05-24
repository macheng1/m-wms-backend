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

export class CreateOrderItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @MaxLength(120)
  productName: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  @IsOptional()
  unitCode?: string;

  @IsString()
  @IsOptional()
  unitName?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  customRequirement?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  drawingUrls?: string[];
}

export class CreateOrderDto {
  @IsString()
  @MaxLength(50)
  @IsOptional()
  orderNumber: string;

  @IsEnum(OrderSource)
  @IsOptional()
  source?: OrderSource;

  @IsEnum(OrderType)
  @IsOptional()
  orderType?: OrderType;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalAmount?: number;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsOptional()
  items?: CreateOrderItemDto[];
}
