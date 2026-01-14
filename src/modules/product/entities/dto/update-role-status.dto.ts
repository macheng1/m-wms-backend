// src/modules/roles/dto/update-role-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UpdateRoleStatusDto {
  @ApiProperty({ example: 1, description: '角色状态：1 启用，0 禁用' })
  @IsNotEmpty({ message: '状态不能为空' })
  isActive: number; // <--- 核心状态字段 1启用 0禁用
}
