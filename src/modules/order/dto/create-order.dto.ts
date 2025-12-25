import { IsString, IsEnum, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class CreateOrderDto {
  @IsString()
  @MaxLength(50)
  orderNumber: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalAmount?: number;
}
