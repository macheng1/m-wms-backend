import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '', description: '企业编码' })
  @IsOptional() // <--- 关键：告诉 NestJS 这个字段可以为空，但它是合法的
  @IsString() // 建议加上，确保如果传了，必须是字符串
  code: string; // 或者使用 tenantId

  @ApiProperty({ example: 'platform_admin', description: '用户名' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'Admin123456', description: '密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6位' })
  password: string;
}
