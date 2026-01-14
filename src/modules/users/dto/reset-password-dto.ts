import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: '被重置人的用户ID不能为空' })
  @IsString()
  userId: string;

  @IsNotEmpty({ message: '新密码不能为空' })
  @Length(6, 20)
  newPassword: string;
}
