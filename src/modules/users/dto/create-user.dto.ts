import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'warehouse_mgr', description: '登录名' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: '张主管', description: '昵称/姓名' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ example: '123456', description: '初始密码' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: ['role-uuid-1'], description: '角色ID数组' })
  @IsArray()
  roleIds: string[];
}
