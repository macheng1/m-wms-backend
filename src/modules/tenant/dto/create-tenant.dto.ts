// src/modules/tenants/dto/create-tenant.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'XH001', description: '企业唯一编码（用于登录）' })
  @IsNotEmpty({ message: '企业编码不能为空' })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9]+$/, { message: '企业编码只能包含字母和数字' })
  code: string; // <--- 新增核心字段

  @ApiProperty({ example: '泰州兴华精密电子厂', description: '企业全称' })
  @IsNotEmpty({ message: '企业名称不能为空' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'heating_element', description: '行业标识', required: false })
  @IsOptional()
  industry?: string;

  @ApiProperty({ example: '张经理', description: '工厂联系人', required: false })
  @IsOptional()
  @IsString()
  contactPerson?: string; // <--- 建议新增

  @ApiProperty({ example: '13800000000', description: '联系电话', required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string; // <--- 建议新增

  @ApiProperty({ example: 'admin', description: '初始管理员账号' })
  @IsNotEmpty({ message: '管理员账号不能为空' })
  @MinLength(4)
  adminUser: string;

  @ApiProperty({ example: '123456', description: '初始管理员密码' })
  @IsNotEmpty({ message: '管理员密码不能为空' })
  @MinLength(6)
  adminPass: string;
}
