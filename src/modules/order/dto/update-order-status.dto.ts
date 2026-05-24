import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsDateString()
  @IsOptional()
  scheduledStartDate?: string;

  @IsDateString()
  @IsOptional()
  scheduledEndDate?: string;
}
