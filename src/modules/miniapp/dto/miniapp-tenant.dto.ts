import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyMiniappTenantDto {
  @ApiProperty({ description: '企业名称' })
  @IsString()
  companyName: string;

  @ApiPropertyOptional({ description: '统一社会信用代码' })
  @IsOptional()
  @IsString()
  creditCode?: string;

  @ApiPropertyOptional({ description: '联系人' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ description: '企业地址' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '主营产品' })
  @IsOptional()
  @IsString()
  mainProducts?: string;

  @ApiPropertyOptional({ description: '营业执照图片 URL' })
  @IsOptional()
  @IsString()
  businessLicenseImage?: string;
}
