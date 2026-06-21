import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMiniappPostDto {
  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: '兼容字段：分类ID' })
  @IsOptional()
  @IsString()
  categoriesId?: string;

  @ApiPropertyOptional({ description: '信息标题', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ description: '联系电话', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ description: '信息内容' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '结构化字段数据，支持对象或 JSON 字符串', type: Object })
  @IsOptional()
  structuredData?: Record<string, any> | string;

  @ApiPropertyOptional({ description: '区域信息' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: '图片列表 JSON 字符串' })
  @IsOptional()
  @IsString()
  imgList?: string;
}

export class QueryMiniappPostDto {
  @ApiPropertyOptional({ description: '兼容页码字段', default: 1 })
  @IsOptional()
  pageNo?: number;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: '兼容字段：分类ID' })
  @IsOptional()
  @IsString()
  categoriesId?: string;

  @ApiPropertyOptional({ description: '发布用户ID' })
  @IsOptional()
  @IsString()
  userid?: string;

  @ApiPropertyOptional({ description: '标题或内容关键字' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '审核状态',
    enum: ['pending', 'published', 'rejected', 'offline', 'all'],
  })
  @IsOptional()
  @IsString()
  status?: 'pending' | 'published' | 'rejected' | 'offline' | 'all';

  @ApiPropertyOptional({ description: '区域信息' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: '是否仅查询已认证企业' })
  @IsOptional()
  certifiedOnly?: string | number | boolean;
}

export class UpdateMiniappPostStatusDto {
  @ApiProperty({ description: '审核状态', enum: ['pending', 'published', 'rejected', 'offline'] })
  @IsString()
  status: 'pending' | 'published' | 'rejected' | 'offline';

  @ApiPropertyOptional({ description: '审核备注' })
  @IsOptional()
  @IsString()
  auditRemark?: string;
}
