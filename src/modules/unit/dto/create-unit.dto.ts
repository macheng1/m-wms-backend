import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { UnitCategory } from '../../../common/constants/unit.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({ description: '单位名称', example: '支' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '单位编码，不传则后端生成', example: 'PIECE' })
  @IsOptional()
  code?: string;

  @ApiProperty({ description: '单位分类', enum: UnitCategory })
  @IsEnum(UnitCategory)
  category: UnitCategory;

  @ApiProperty({ description: '与基础单位的换算比例', example: 1 })
  @IsNumber()
  @Min(0.01)
  baseRatio: number;

  @ApiProperty({ description: '基础单位编码', example: 'PIECE' })
  @IsString()
  baseUnitCode: string;

  @ApiPropertyOptional({ description: '单位符号', example: 'pcs' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({ description: '单位说明' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '状态：1启用，0禁用', example: 1 })
  @IsOptional()
  @IsNumber()
  isActive?: number;

  @ApiPropertyOptional({ description: '排序值', example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
