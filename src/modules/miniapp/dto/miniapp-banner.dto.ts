import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryMiniappBannerDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  isActive?: number | string;
}

export class SaveMiniappBannerDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsIn(['none', 'page', 'webview', 'post', 'category'])
  linkType?: 'none' | 'page' | 'webview' | 'post' | 'category';

  @IsOptional()
  @IsString()
  linkValue?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  isActive?: number;
}

export class UpdateMiniappBannerStatusDto {
  @IsIn([0, 1])
  isActive: number;
}
