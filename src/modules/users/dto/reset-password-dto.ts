import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: '被重置密码的员工ID' })
  @IsNotEmpty({ message: '被重置人的用户ID不能为空' })
  @IsString()
  userId: string;

  @ApiProperty({ description: '新密码，长度 6-20 位', example: 'Admin123456' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @Length(6, 20)
  newPassword: string;
}
