import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: '登录用户名', example: 'zhangsan', default: 'zhangsan' })
  @IsString()
  @MaxLength(100)
  username: string;

  @ApiProperty({ description: '手机号', example: '13800138000', default: '13800138000' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ description: '短信验证码', example: '123456', default: '123456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  smsCode: string;

  @ApiPropertyOptional({
    description: '邮箱',
    example: 'user@example.com',
    default: 'user@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: '登录密码，至少 6 位', example: 'Admin123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @ApiPropertyOptional({ description: '名', example: 'San', default: 'San' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: '姓', example: 'Zhang', default: 'Zhang' })
  @IsString()
  @IsOptional()
  lastName?: string;
}
