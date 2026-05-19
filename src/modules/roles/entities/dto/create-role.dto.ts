// src/modules/roles/dto/create-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional, IsIn } from 'class-validator';
import { RoleScope } from '../role.entity';

export class CreateRoleDto {
  @ApiProperty({ example: '仓库主管', description: '角色名称' })
  @IsNotEmpty({ message: '角色名称不能为空' })
  @IsString()
  name: string;
  @IsOptional()
  isActive?: number = 1; // 1启用 0禁用

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
    example: ['tenant:inventory:list', 'tenant:inventory:inbound'],
    description: '租户权限码集合，只允许 tenant:* 权限',
  })
  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[];
}

export class UpdateRoleDto extends CreateRoleDto {}
