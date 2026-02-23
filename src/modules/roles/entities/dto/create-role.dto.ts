// src/modules/roles/dto/create-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: '仓库主管', description: '角色名称' })
  @IsNotEmpty({ message: '角色名称不能为空' })
  @IsString()
  name: string;
  @IsOptional()
  isActive?: number = 1; // 1启用 0禁用
  @ApiProperty({ example: '负责库区管理及入库审核', description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({
    example: ['wms:inventory:list', 'wms:inventory:inbound'],
    description: '权限码集合',
  })
  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[]; // 这里直接存前端 MENU_CONFIG 里的 code
}

export class UpdateRoleDto extends CreateRoleDto {}
