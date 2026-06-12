import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMiniappBannerDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: '轮播图标题关键字' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '状态：1启用，0禁用' })
  @IsOptional()
  isActive?: number | string;
}

export class SaveMiniappBannerDto {
  @ApiPropertyOptional({ description: '轮播图ID，更新时传入' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '轮播图标题', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: '图片 URL' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({
    description: '跳转类型',
    enum: ['none', 'page', 'webview', 'post', 'category'],
  })
  @IsOptional()
  @IsIn(['none', 'page', 'webview', 'post', 'category'])
  linkType?: 'none' | 'page' | 'webview' | 'post' | 'category';

  @ApiPropertyOptional({ description: '跳转目标值' })
  @IsOptional()
  @IsString()
  linkValue?: string;

  @ApiPropertyOptional({ description: '排序值', example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '状态：1启用，0禁用', example: 1 })
  @IsOptional()
  isActive?: number;
}

export class UpdateMiniappBannerStatusDto {
  @ApiProperty({ description: '状态：1启用，0禁用', enum: [0, 1] })
  @IsIn([0, 1])
  isActive: number;
}
