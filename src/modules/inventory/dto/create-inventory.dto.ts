import { IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  @MaxLength(100)
  sku: string;

  @IsString()
  @MaxLength(200)
  productName: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  location?: string;
}
