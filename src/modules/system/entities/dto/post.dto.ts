import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SavePostDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNotEmpty({ message: '岗位编码不能为空' })
  @IsString()
  postCode: string;

  @IsNotEmpty({ message: '岗位名称不能为空' })
  @IsString()
  postName: string;

  @IsOptional()
  postSort?: number;

  @IsOptional()
  isActive?: number;

  @IsOptional()
  remark?: string | null;
}

export class QueryPostDto {
  @IsOptional()
  postCode?: string;

  @IsOptional()
  postName?: string;

  @IsOptional()
  isActive?: number;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}
