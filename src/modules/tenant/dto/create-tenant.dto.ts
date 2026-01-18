// src/modules/tenants/dto/create-tenant.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, IsOptional, IsPhoneNumber } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'XH001', description: '企业唯一编码（用于登录）' })
  code: string; // <--- 新增核心字段

  @ApiProperty({ example: '泰州兴华精密电子厂', description: '企业全称' })
  @IsNotEmpty({ message: '企业名称不能为空' })
  @IsString()
  name: string;

  @ApiProperty({ example: '13800138000', description: '手机验证码' })
  @IsNotEmpty({ message: '验证码不能为空' })
  @IsString()
  smsCode: string;

  @ApiProperty({ example: '13800138000', description: '联系电话（需验证）' })
  @IsNotEmpty({ message: '联系电话不能为空' })
  @IsString()
  contactPhone: string; // <--- 改为必填，需要验证

  @ApiProperty({ example: 'heating_element', description: '行业标识', required: false })
  @IsOptional()
  industry?: string;

  @ApiProperty({ example: '张经理', description: '工厂联系人', required: false })
  @IsOptional()
  @IsString()
  contactPerson?: string; // <--- 建议新增

  @ApiProperty({ example: 'admin', description: '初始管理员账号' })
  @IsNotEmpty({ message: '管理员账号不能为空' })
  @MinLength(4)
  adminUser: string;

  @ApiProperty({ example: '123456', description: '初始管理员密码' })
  @IsNotEmpty({ message: '管理员密码不能为空' })
  @MinLength(6)
  adminPass: string;
  // ========== 以下为补充字段 ==========

  @ApiProperty({
    example: '江苏省泰州市海陵区xx路xx号',
    description: '工厂详细地址',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '江苏省泰州市xx区xx路xx号', description: '工厂地址', required: false })
  @IsOptional()
  @IsString()
  factoryAddress?: string;

  @ApiProperty({
    example: '江苏省泰州市xx区xx路xx号',
    description: '公司注册地址',
    required: false,
  })
  @IsOptional()
  @IsString()
  registerAddress?: string;

  @ApiProperty({ example: 'www.example.com', description: '官网', required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ example: '企业备注', description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  // 税务信息
  @ApiProperty({ example: '9132xxxxxxxxxxxx', description: '税号', required: false })
  @IsOptional()
  @IsString()
  taxNo?: string;

  @ApiProperty({ example: '一般纳税人', description: '纳税人类型', required: false })
  @IsOptional()
  @IsString()
  taxpayerType?: string;

  @ApiProperty({ example: '9132xxxxxxxxxxxx', description: '统一社会信用代码', required: false })
  @IsOptional()
  @IsString()
  creditCode?: string;

  // 银行信息
  @ApiProperty({ example: '中国银行', description: '开户行', required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ example: '622202xxxxxxxxxx', description: '银行账号', required: false })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  // 营业执照信息
  @ApiProperty({ example: '320xxxxxxx', description: '营业执照号', required: false })
  @IsOptional()
  @IsString()
  businessLicenseNo?: string;

  @ApiProperty({
    example: new Date('2030-12-31'),
    description: '营业执照有效期',
    required: false,
    type: Date,
  })
  @IsOptional()
  businessLicenseExpire?: Date;

  // 法人和注册信息
  @ApiProperty({ example: '李四', description: '法人代表', required: false })
  @IsOptional()
  @IsString()
  legalPerson?: string;

  @ApiProperty({ example: '1000万人民币', description: '注册资本', required: false })
  @IsOptional()
  @IsString()
  registeredCapital?: string;

  @ApiProperty({ example: '制造业', description: '行业分类', required: false })
  @IsOptional()
  @IsString()
  industryType?: string;

  // 资质信息
  @ApiProperty({ example: 'A123456789', description: '资质证书编号', required: false })
  @IsOptional()
  @IsString()
  qualificationNo?: string;

  @ApiProperty({
    example: new Date('2030-12-31'),
    description: '资质证书有效期',
    required: false,
    type: Date,
  })
  @IsOptional()
  qualificationExpire?: Date;

  // 联系信息
  @ApiProperty({ example: 'test@example.com', description: '联系邮箱', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: '0523-88888888', description: '传真', required: false })
  @IsOptional()
  @IsString()
  fax?: string;

  // 企业基本信息
  @ApiProperty({
    example: new Date('2020-01-01'),
    description: '成立日期',
    required: false,
    type: Date,
  })
  @IsOptional()
  foundDate?: Date;

  @ApiProperty({ example: 100, description: '员工人数', required: false })
  @IsOptional()
  staffCount?: number;

  @ApiProperty({ example: '加热管、加热圈', description: '主要产品', required: false })
  @IsOptional()
  @IsString()
  mainProducts?: string;

  @ApiProperty({ example: '100万件/年', description: '年产能', required: false })
  @IsOptional()
  @IsString()
  annualCapacity?: string;

  @ApiProperty({ example: 'A01', description: '所属行业代码', required: false })
  @IsOptional()
  @IsString()
  industryCode?: string;

  @ApiProperty({ example: '电子制造业', description: '所属行业名称', required: false })
  @IsOptional()
  @IsString()
  industryName?: string;
}
