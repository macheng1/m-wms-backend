import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional, IsNumber, Length } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: '登录用户名' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string;

  @ApiProperty({ description: '初始化密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  @Length(6, 20, { message: '密码长度需在6-20位之间' })
  password: string;

  @ApiProperty({ description: '真实姓名' })
  @IsOptional()
  @IsString()
  realName?: string;

  @ApiProperty({ description: '关联角色ID数组' })
  @IsArray({ message: '角色ID必须是数组' })
  @IsString({ each: true })
  roleIds: string[]; // 绑定你在 Role 模块创建的 ID

  @ApiProperty({ description: '是否启用 (1启用/0禁用)', default: 1 })
  @IsOptional()
  @IsNumber()
  isActive: number = 1;

  @ApiProperty({ description: '头像', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}
