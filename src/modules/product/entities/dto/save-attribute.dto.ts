// src/modules/attributes/entities/dto/save-attribute.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 规格选项子 DTO **/
export class AttributeOptionItemDto {
  @ApiProperty({ description: '选项ID，更新时如果带上则保留/更新，不带则视为新增' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '具体选项值，如：304、12.5' })
  @IsNotEmpty({ message: '规格值不能为空' })
  @IsString()
  value: string;

  @ApiProperty({ description: '排序，用于前端展示顺序', default: 0 })
  @IsOptional()
  @IsNumber({}, { message: '排序必须是数字' })
  @Type(() => Number) // 强制确保从前端传来的字符串转为数字
  sort: number = 0;

  @ApiProperty({ description: '状态：1启用，0禁用', default: 1 })
  @IsOptional()
  @IsNumber()
  isActive?: number = 1;
}

/** 属性保存主 DTO **/
export class SaveAttributeDto {
  @ApiProperty({ description: '属性ID，更新时必传' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '属性名称', example: '材质' })
  @IsNotEmpty({ message: '属性名称不能为空' })
  @IsString()
  name: string;

  @ApiProperty({ description: '业务编码', example: 'material' })
  @IsNotEmpty({ message: '属性编码不能为空' })
  @IsString()
  code: string;

  @ApiProperty({ description: '输入类型', enum: ['select', 'input', 'number'], default: 'select' })
  @IsEnum(['select', 'input', 'number'])
  type: string;

  @ApiProperty({ description: '单位', required: false, example: 'mm' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ description: '状态：1启用，0禁用', default: 1 })
  @IsOptional()
  @IsNumber()
  isActive?: number = 1;

  @ApiProperty({
    description: '规格选项列表',
    type: [AttributeOptionItemDto], // Swagger 中正确显示数组结构
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true }) // 开启嵌套校验
  @Type(() => AttributeOptionItemDto) // 核心：告诉 class-transformer 如何转化数组项
  options?: AttributeOptionItemDto[];
}
