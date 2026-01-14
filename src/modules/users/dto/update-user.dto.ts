import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ description: '员工唯一ID' })
  @IsNotEmpty({ message: '员工ID不能为空' })
  @IsString()
  id: string; // 动作驱动规范：ID 放在 Body 中
}
