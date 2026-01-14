import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SaveDictDto {
  @IsOptional() id?: string;
  @IsNotEmpty() type: string;
  @IsNotEmpty() label: string;
  @IsNotEmpty() value: string;
  @IsOptional() sort?: number = 0;
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
}
