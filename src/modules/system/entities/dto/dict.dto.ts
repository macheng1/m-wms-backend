import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveDictDto {
  @ApiPropertyOptional({ description: '字典ID，更新时传入' })
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: '字典作用域', enum: ['platform', 'tenant'] })
  @IsOptional()
  @IsIn(['platform', 'tenant'])
  scope?: 'platform' | 'tenant';

  @ApiProperty({ description: '字典类型', example: 'product_category' })
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: '字典标签', example: '启用' })
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: '字典值', example: '1' })
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ description: '排序值', default: 0 })
  @IsOptional()
  sort?: number = 0;

  @ApiPropertyOptional({ description: '状态：1启用，0禁用', default: 1 })
  @IsOptional()
  isActive?: number = 1;

  @ApiPropertyOptional({ description: '是否系统内置：1是，0否', default: 0 })
  @IsOptional()
  isSystem?: number = 0;

  @ApiPropertyOptional({ description: '是否允许租户扩展：1是，0否', default: 0 })
  @IsOptional()
  allowTenantExtend?: number = 0;

  @ApiPropertyOptional({ description: '是否允许租户覆盖：1是，0否', default: 0 })
  @IsOptional()
  allowTenantOverride?: number = 0;

  @ApiPropertyOptional({ description: '父级字典ID' })
  @IsOptional()
  parentId?: string | null;
}

export class QueryDictDto {
  @ApiProperty({ description: '字典类型' })
  @IsNotEmpty({ message: '请提供字典类型' })
  type: string;
}
export class UpdateDictDto {
  @ApiProperty({ description: '字典ID' })
  @IsNotEmpty({ message: '修改时必须提供ID' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ description: '字典作用域', enum: ['platform', 'tenant'] })
  @IsOptional()
  @IsIn(['platform', 'tenant'])
  scope?: 'platform' | 'tenant';

  @ApiPropertyOptional({ description: '字典类型' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: '字典标签' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: '字典值' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: '排序值' })
  @IsOptional()
  @IsNumber()
  sort?: number;

  @ApiPropertyOptional({ description: '状态：1启用，0禁用' })
  @IsOptional()
  @IsNumber()
  isActive?: number;

  @ApiPropertyOptional({ description: '是否系统内置：1是，0否' })
  @IsOptional()
  @IsNumber()
  isSystem?: number;

  @ApiPropertyOptional({ description: '是否允许租户扩展：1是，0否' })
  @IsOptional()
  @IsNumber()
  allowTenantExtend?: number;

  @ApiPropertyOptional({ description: '是否允许租户覆盖：1是，0否' })
  @IsOptional()
  @IsNumber()
  allowTenantOverride?: number;

  @ApiPropertyOptional({ description: '父级字典ID' })
  @IsOptional()
  @IsString()
  parentId?: string | null;
}
