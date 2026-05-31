import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMiniappPostDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  categoriesId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  imgList?: string;
}

export class QueryMiniappPostDto {
  @IsOptional()
  pageNo?: number;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  categoriesId?: string;

  @IsOptional()
  @IsString()
  userid?: string;
}
