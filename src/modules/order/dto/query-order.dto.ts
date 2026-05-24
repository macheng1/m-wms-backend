import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderSource, OrderStatus, OrderType } from '../entities/order.entity';

export class QueryOrderDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;

  @IsString()
  @IsOptional()
  orderNumber?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsEnum(OrderType)
  @IsOptional()
  orderType?: OrderType;

  @IsEnum(OrderSource)
  @IsOptional()
  source?: OrderSource;

  @IsString()
  @IsOptional()
  customerKeyword?: string;
}
