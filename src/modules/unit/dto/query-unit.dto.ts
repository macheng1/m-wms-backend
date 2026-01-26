import { IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UnitCategory } from '../../../common/constants/unit.constant';

export class QueryUnitDto {
  @IsOptional()
  @IsEnum(UnitCategory)
  category?: UnitCategory;

  @IsOptional()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;
}
