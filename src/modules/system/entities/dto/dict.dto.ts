import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SaveDictDto {
  @IsOptional() id?: string;
  @IsOptional()
  @IsIn(['platform', 'tenant'])
  scope?: 'platform' | 'tenant';
  @IsNotEmpty() type: string;
  @IsNotEmpty() label: string;
  @IsNotEmpty() value: string;
  @IsOptional() sort?: number = 0;
  @IsOptional() isActive?: number = 1;
  @IsOptional() isSystem?: number = 0;
  @IsOptional() allowTenantExtend?: number = 0;
  @IsOptional() allowTenantOverride?: number = 0;
  @IsOptional() parentId?: string | null;
}

export class QueryDictDto {
  @IsNotEmpty({ message: '请提供字典类型' })
  type: string;
}
export class UpdateDictDto {
  @IsNotEmpty({ message: '修改时必须提供ID' })
  @IsString()
  id: string;

  @IsOptional()
  @IsIn(['platform', 'tenant'])
  scope?: 'platform' | 'tenant';

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsNumber()
  sort?: number;

  @IsOptional()
  @IsNumber()
  isActive?: number;

  @IsOptional()
  @IsNumber()
  isSystem?: number;

  @IsOptional()
  @IsNumber()
  allowTenantExtend?: number;

  @IsOptional()
  @IsNumber()
  allowTenantOverride?: number;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}
