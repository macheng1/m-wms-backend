import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: '目标订单状态',
    enum: OrderStatus,
    example: OrderStatus.CONFIRMED,
    default: OrderStatus.CONFIRMED,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ description: '状态变更备注', example: '客户已确认订单' })
  @IsString()
  @IsOptional()
  remark?: string;

  @ApiPropertyOptional({
    description: '计划开始日期',
    example: '2026-06-12',
    default: '2026-06-12',
  })
  @IsDateString()
  @IsOptional()
  scheduledStartDate?: string;

  @ApiPropertyOptional({
    description: '计划结束日期',
    example: '2026-06-20',
    default: '2026-06-20',
  })
  @IsDateString()
  @IsOptional()
  scheduledEndDate?: string;
}
