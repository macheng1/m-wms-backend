import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, IsInt, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationCategory, NotificationPriority } from '../interfaces/notification-type.enum';

/**
 * 发送通知 DTO
 *
 * 用于验证发送通知的请求参数，确保数据的合法性和完整性
 */
export class SendNotificationDto {
  /**
   * 租户ID
   * 必填，用于多租户数据隔离
   */
  @ApiProperty({
    description: '租户ID',
    example: 'tenant-001',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  /**
   * 通知类型
   * 必填，区分通知的业务场景
   */
  @ApiProperty({
    description: '通知类型',
    enum: NotificationType,
    example: NotificationType.SYSTEM,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  /**
   * 通知分类
   * 可选，更细粒度的业务场景分类
   */
  @ApiPropertyOptional({
    description: '通知分类',
    enum: NotificationCategory,
    example: NotificationCategory.INVENTORY_WARNING,
  })
  @IsEnum(NotificationCategory)
  @IsOptional()
  category?: NotificationCategory;

  /**
   * 通知标题
   * 必填，简短的通知标题
   */
  @ApiProperty({
    description: '通知标题',
    example: '库存预警',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  /**
   * 通知内容
   * 必填，详细的通知内容描述
   */
  @ApiProperty({
    description: '通知内容',
    example: '产品A的当前库存已低于预警值10，当前库存：5',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  /**
   * 扩展数据
   * 可选，用于携带额外的结构化数据
   */
  @ApiPropertyOptional({
    description: '扩展数据',
    example: { productId: '123', productName: '产品A', currentStock: 5 },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  /**
   * 通知优先级
   * 可选，默认为普通优先级
   */
  @ApiPropertyOptional({
    description: '通知优先级',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  /**
   * 过期时间（秒）
   * 可选，通知的有效期，默认7天（604800秒）
   */
  @ApiPropertyOptional({
    description: '过期时间（秒），默认7天',
    example: 604800,
    minimum: 60,
    maximum: 31536000, // 365天
  })
  @IsInt()
  @Min(60)
  @IsOptional()
  ttl?: number;
}

/**
 * 发送给指定用户的通知 DTO
 */
export class SendToUsersDto extends SendNotificationDto {
  /**
   * 目标用户ID列表
   * 必填，通知将发送给这些用户
   */
  @ApiProperty({
    description: '目标用户ID列表',
    example: ['user-123', 'user-456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userIds: string[];
}

/**
 * 发送给指定角色的通知 DTO
 */
export class SendToRoleDto extends SendNotificationDto {
  /**
   * 目标角色代码
   * 必填，通知将发送给拥有该角色的所有用户
   */
  @ApiProperty({
    description: '目标角色代码',
    example: 'WAREHOUSE_MANAGER',
  })
  @IsString()
  @IsNotEmpty()
  roleCode: string;
}
