import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveDepartmentDto {
  @ApiPropertyOptional({ description: '部门ID，更新时传入' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: '父级部门ID' })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiProperty({ description: '部门编码', example: 'WMS' })
  @IsNotEmpty({ message: '部门编码不能为空' })
  @IsString()
  deptCode: string;

  @ApiProperty({ description: '部门名称', example: '仓储部' })
  @IsNotEmpty({ message: '部门名称不能为空' })
  @IsString()
  deptName: string;

  @ApiPropertyOptional({ description: '排序值', example: 0 })
  @IsOptional()
  orderNum?: number;

  @ApiPropertyOptional({ description: '负责人' })
  @IsOptional()
  leader?: string | null;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsOptional()
  phone?: string | null;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional({ description: '状态：1启用，0禁用', example: 1 })
  @IsOptional()
  isActive?: number;
}

export class QueryDepartmentDto {
  @ApiPropertyOptional({ description: '部门名称模糊查询' })
  @IsOptional()
  deptName?: string;

  @ApiPropertyOptional({ description: '状态：1启用，0禁用' })
  @IsOptional()
  isActive?: number;
}
