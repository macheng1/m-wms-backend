import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveDepartmentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsNotEmpty({ message: '部门编码不能为空' })
  @IsString()
  deptCode: string;

  @IsNotEmpty({ message: '部门名称不能为空' })
  @IsString()
  deptName: string;

  @IsOptional()
  orderNum?: number;

  @IsOptional()
  leader?: string | null;

  @IsOptional()
  phone?: string | null;

  @IsOptional()
  email?: string | null;

  @IsOptional()
  isActive?: number;
}

export class QueryDepartmentDto {
  @IsOptional()
  deptName?: string;

  @IsOptional()
  isActive?: number;
}
