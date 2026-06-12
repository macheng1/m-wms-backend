import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMiniappCategoryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: '分类名称关键字' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '状态：1启用，0禁用' })
  @IsOptional()
  isActive?: number | string;
}

export class SaveMiniappCategoryDto {
  @ApiPropertyOptional({ description: '分类ID，更新时传入' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '分类名称', example: '供求信息' })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ description: '分类编码，不传则后端生成' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @ApiPropertyOptional({ description: '分类图标 URL' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ description: '分类跳转链接' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ description: '分类描述' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ description: '模板字段配置，支持 JSON 数组或字符串', type: Object })
  @IsOptional()
  templateFields?: any[] | string;

  @ApiPropertyOptional({ description: '排序值', example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '状态：1启用，0禁用', example: 1 })
  @IsOptional()
  isActive?: number;
}

export class UpdateMiniappCategoryStatusDto {
  @ApiProperty({ description: '状态：1启用，0禁用', enum: [0, 1] })
  @IsIn([0, 1])
  isActive: number;
}
