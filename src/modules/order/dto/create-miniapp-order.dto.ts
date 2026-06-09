import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMiniappOrderDto {
  @IsString()
  tenantId: string;

  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @MaxLength(80)
  contactName: string;

  @IsString()
  @MaxLength(30)
  contactPhone: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}
