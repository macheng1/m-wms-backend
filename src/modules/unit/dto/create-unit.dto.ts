import { IsString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { UnitCategory } from '../../../common/constants/unit.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({ description: '单位名称', example: '支' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '单位编码，不传则后端生成', example: 'PIECE' })
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: '单位分类，前端不传时默认为 COUNT', enum: UnitCategory })
  @IsOptional()
  @IsEnum(UnitCategory)
  category?: UnitCategory;

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
