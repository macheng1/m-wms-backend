import { IsEnum, IsIn, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UnitCategory } from '../../../common/constants/unit.constant';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryUnitDto {
  @ApiPropertyOptional({ description: '单位分类', enum: UnitCategory })
  @IsOptional()
  @IsEnum(UnitCategory)
  category?: UnitCategory;

  @ApiPropertyOptional({ description: '单位名称或编码关键字' })
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '模板来源', enum: ['standard', 'custom'] })
  @IsOptional()
  @IsIn(['standard', 'custom'])
  templateScope?: 'standard' | 'custom';

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;
}
