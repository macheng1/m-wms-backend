import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationCategory } from '../interfaces/notification-type.enum';

/**
 * 公开咨询请求 DTO
 *
 * 供官网等公开场景使用，不需要登录认证
 */
export class PublicConsultationDto {
  /**
   * 租户ID
   * 必填，用于识别咨询归属于哪个租户
   */
  @ApiProperty({
    description: '租户ID',
    example: 'tenant-001',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  /**
   * 咨询人姓名
   * 必填
   */
  @ApiProperty({
    description: '咨询人姓名',
    example: '张三',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * 联系方式（电话或手机号）
   * 必填
   */
  @ApiProperty({
    description: '联系电话',
    example: '13800138000',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  /**
   * 联系邮箱
   * 可选
   */
  @ApiPropertyOptional({
    description: '联系邮箱',
    example: 'zhangsan@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  /**
   * 公司名称
   * 可选
   */
  @ApiPropertyOptional({
    description: '公司名称',
    example: '某某科技有限公司',
  })
  @IsString()
  @IsOptional()
  company?: string;

  /**
   * 咨询类型
   * 可选，用于分类
   */
  @ApiPropertyOptional({
    description: '咨询类型',
    enum: ['PRODUCT', 'PRICE', 'COOPERATION', 'OTHER'],
    example: 'PRODUCT',
  })
  @IsString()
  @IsOptional()
  consultationType?: string;

  /**
   * 咨询内容
   * 必填
   */
  @ApiProperty({
    description: '咨询内容',
    example: '我想咨询一下产品A的价格和规格',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  /**
   * 产品ID/SKU
   * 可选，如果咨询特定产品
   */
  @ApiPropertyOptional({
    description: '产品ID/SKU（咨询特定产品时填写）',
    example: 'SKU-001',
  })
  @IsString()
  @IsOptional()
  productSku?: string;

  /**
   * 产品名称
   * 可选，方便展示
   */
  @ApiPropertyOptional({
    description: '产品名称',
    example: '产品A',
  })
  @IsString()
  @IsOptional()
  productName?: string;

  /**
   * 来源渠道
   * 可选，用于统计咨询来源
   */
  @ApiPropertyOptional({
    description: '来源渠道',
    example: '官网',
  })
  @IsString()
  @IsOptional()
  source?: string;

  /**
   * 扩展数据
   * 可选，用于存储额外信息
   */
  @ApiPropertyOptional({
    description: '扩展数据（JSON格式）',
    example: { userAgent: 'Mozilla/5.0...', ip: '1.2.3.4' },
  })
  @IsOptional()
  extraData?: Record<string, any>;
}

/**
 * 公开咨询响应 DTO
 */
export class PublicConsultationResponseDto {
  /**
   * 咨询ID
   */
  @ApiProperty({
    description: '咨询ID',
    example: 'consult-123',
  })
  id: string;

  /**
   * 状态消息
   */
  @ApiProperty({
    description: '状态消息',
    example: '咨询已提交，我们会尽快与您联系',
  })
  message: string;

  /**
   * 预计响应时间（描述）
   */
  @ApiPropertyOptional({
    description: '预计响应时间',
    example: '工作时间内2小时内',
  })
  expectedResponseTime?: string;
}
