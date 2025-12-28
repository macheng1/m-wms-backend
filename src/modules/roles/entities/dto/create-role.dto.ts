import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: '质检组长', description: '角色名称' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: ['wh:inbound', 'prod:order:view'],
    description: '权限标识(Code)数组',
  })
  @IsArray()
  @IsNotEmpty({ each: true })
  permissionCodes: string[];
}
