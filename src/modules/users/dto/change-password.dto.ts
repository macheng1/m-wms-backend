import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: '旧密码', example: 'OldPass123' })
  @IsNotEmpty({ message: '旧密码不能为空' })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    description: '新密码，长度 6-20 位',
    example: 'Admin123456',
    minLength: 6,
    maxLength: 20,
  })
  @IsNotEmpty({ message: '新密码不能为空' })
  @Length(6, 20, { message: '新密码至少6位' })
  newPassword: string;
}
