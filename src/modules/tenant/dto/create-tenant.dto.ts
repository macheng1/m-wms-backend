import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: '某某精密电子厂', description: '企业名称' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'heating_element', description: '行业标识' })
  @IsOptional()
  industry?: string;

  @ApiProperty({ example: 'admin', description: '初始管理员账号' })
  @IsNotEmpty()
  @MinLength(4)
  adminUser: string;

  @ApiProperty({ example: '123456', description: '初始管理员密码' })
  @IsNotEmpty()
  @MinLength(6)
  adminPass: string;
}
