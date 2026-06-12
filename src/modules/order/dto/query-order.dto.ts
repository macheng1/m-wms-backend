import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderSource, OrderStatus, OrderType } from '../entities/order.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryOrderDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: '订单编号模糊查询' })
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @ApiPropertyOptional({ description: '订单状态', enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ description: '订单类型', enum: OrderType })
  @IsEnum(OrderType)
  @IsOptional()
  orderType?: OrderType;

  @ApiPropertyOptional({ description: '订单来源', enum: OrderSource })
  @IsEnum(OrderSource)
  @IsOptional()
  source?: OrderSource;

  @ApiPropertyOptional({ description: '客户名称/手机号关键字' })
  @IsString()
  @IsOptional()
  customerKeyword?: string;
}
