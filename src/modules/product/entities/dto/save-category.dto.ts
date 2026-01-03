import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaveCategoryDto {
  @ApiProperty({ description: '类目ID，更新时必传', required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '类目名称', example: '引出棒' })
  @IsNotEmpty({ message: '类目名称不能为空' })
  @IsString()
  name: string;

  @ApiProperty({ description: '类目编码 (不传则根据名称简拼自动生成)', required: false })
  @IsOptional() // 核心修改：改为可选，支持后端自动生成
  @IsString()
  code?: string;

  @ApiProperty({ description: '绑定的属性ID列表', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // 确保数组内每一项都是字符串
  attributeIds?: string[];

  @ApiProperty({ description: '状态：1启用，0禁用', default: 1 })
  @IsOptional()
  @IsNumber()
  @IsIn([0, 1], { message: '状态只能是 0 或 1' }) // 严格限制状态值
  isActive?: number = 1;
}

/**
 * 分页查询 DTO
 * 注意：Query 参数通过 URL 传递，默认为 string，必须使用 @Type 进行显式转换
 */
export class QueryCategoryDto {
  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  @Type(() => Number) // 核心修改：强制转为数字
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页条数', default: 20, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiProperty({ description: '类目名称模糊搜索', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '状态筛选', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsIn([0, 1])
  isActive?: number;
}
