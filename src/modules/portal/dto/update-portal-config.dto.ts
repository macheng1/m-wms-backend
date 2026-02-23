// src/modules/portal/dto/update-portal-config.dto.ts
import { IsOptional, IsString, IsUrl, IsObject, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePortalConfigDto {
  @ApiProperty({ required: false, example: '无锡元思科技' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @ApiProperty({ required: false, example: 'https://oss.pinmalink.com/logo.png' })
  @IsOptional()
  @IsUrl({}, { message: 'Logo 必须是有效的 URL 地址' })
  logo?: string;

  @ApiProperty({ required: false, example: '专注高品质电热管配件' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slogan?: string;

  @ApiProperty({ required: false, description: '工厂详细介绍' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: '页脚信息 JSON' })
  @IsOptional()
  @IsObject()
  footerInfo?: Record<string, any>;

  @ApiProperty({ required: false, description: 'SEO 配置 JSON' })
  @IsOptional()
  @IsObject()
  seoConfig?: Record<string, any>;

  @ApiProperty({ required: false, example: 1, description: '1启用，0禁用' })
  @IsOptional()
  @IsNumber()
  isActive?: number;
}
