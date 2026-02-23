import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { UnitCategory } from '../../../common/constants/unit.constant';

export class CreateUnitDto {
  @IsString()
  name: string;

  @IsOptional()
  code?: string;

  @IsEnum(UnitCategory)
  category: UnitCategory;

  @IsNumber()
  @Min(0.01)
  baseRatio: number;

  @IsString()
  baseUnitCode: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  isActive?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
