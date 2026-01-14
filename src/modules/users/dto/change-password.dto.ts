import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: '旧密码不能为空' })
  @IsString()
  oldPassword: string;

  @IsNotEmpty({ message: '新密码不能为空' })
  @Length(6, 20, { message: '新密码至少6位' })
  newPassword: string;
}
