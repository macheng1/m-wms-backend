import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsObject,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 产品保存/更新 DTO
 * 适配引出棒物料管理需求
 */
export class SaveProductDto {
  @ApiProperty({ description: '产品ID (更新时必传)', required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '产品名称', example: '不锈钢引出棒' })
  @IsNotEmpty({ message: '产品名称不能为空' })
  @IsString()
  name: string;

  @ApiProperty({ description: '产品编码/SKU (不传则根据规则自动生成)', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '所属类目ID' })
  @IsNotEmpty({ message: '必须选择一个类目' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: '单位', example: '支', required: false })
  @IsOptional()
  @IsString()
  unit?: string;

  /**
   * 核心：动态规格存储 (对应 MySQL JSON 列)
   * 结构：{ "ATTR_CZ": "304", "ATTR_ZJ": "1.5" }
   */
  @ApiProperty({ description: '动态规格详情', type: Object })
  @IsNotEmpty({ message: '规格参数不能为空' })
  @IsObject()
  specs: Record<string, any>;

  /**
   * 产品图片列表 (对应 MySQL JSON 列)
   */
  @ApiProperty({ description: '产品图片列表', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: '安全库存', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  safetyStock?: number = 0;

  @ApiProperty({ description: '状态：1 启用，0 禁用', default: 1 })
  @IsOptional()
  @IsNumber()
  @IsIn([0, 1])
  isActive?: number = 1;
}
