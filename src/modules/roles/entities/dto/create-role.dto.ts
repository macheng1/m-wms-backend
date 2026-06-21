// src/modules/roles/dto/create-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional, IsIn, IsNumber } from 'class-validator';
import { RoleDataScope, RoleScope } from '../role.entity';

export class CreateRoleDto {
  @ApiProperty({ example: '仓库主管', description: '角色名称' })
  @IsNotEmpty({ message: '角色名称不能为空' })
  @IsString()
  name: string;
  @IsOptional()
  isActive?: number = 1; // 1启用 0禁用

  @ApiProperty({ example: 'WAREHOUSE_MANAGER', description: '角色编码', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    example: 'tenant',
    description: '角色归属域。租户管理端只能创建 tenant 角色；platform 角色仅平台超级管理员使用。',
    required: false,
  })
  @IsOptional()
  @IsIn(['platform', 'tenant'])
  scope?: RoleScope = 'tenant';

  @ApiProperty({ example: '负责库区管理及入库审核', description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({
    example: 'ALL',
    description: '数据权限范围：ALL 全部、CUSTOM 自定义部门、DEPT 本部门、DEPT_AND_CHILD 本部门及以下、SELF 仅本人',
    required: false,
  })
  @IsOptional()
  @IsIn(['ALL', 'CUSTOM', 'DEPT', 'DEPT_AND_CHILD', 'SELF'])
  dataScope?: RoleDataScope = 'ALL';

  @ApiProperty({ example: ['uuid'], description: '自定义数据权限部门ID集合', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deptIds?: string[];

  @ApiProperty({
    example: ['tenant:inventory:list', 'tenant:inventory:inbound'],
    description: '租户菜单码集合，只允许 tenant:* 菜单',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  menuCodes?: string[];

  @ApiProperty({ example: [1, 2], description: '菜单ID集合', required: false })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  menuIds?: number[];
}

export class UpdateRoleDto extends CreateRoleDto {}
