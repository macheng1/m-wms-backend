import { IsOptional, IsBoolean, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationCategory } from '../interfaces/notification-type.enum';
import { Type } from 'class-transformer';

/**
 * 查询通知列表 DTO
 *
 * 用于验证查询通知列表的请求参数，支持多种筛选条件
 */
export class QueryNotificationsDto {
  /**
   * 页码
   * 从1开始，默认为1
   */
  @ApiPropertyOptional({
    description: '页码，从1开始',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * 每页数量
   * 默认为20，最大100
   */
  @ApiPropertyOptional({
    description: '每页数量',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  /**
   * 只查询未读
   * 为true时只返回未读通知
   */
  @ApiPropertyOptional({
    description: '是否只查询未读通知',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean = false;

  /**
   * 按通知类型筛选
   * 可选，筛选特定类型的通知
   */
  @ApiPropertyOptional({
    description: '按通知类型筛选',
    enum: NotificationType,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  /**
   * 按通知分类筛选
   * 可选，筛选特定分类的通知
   */
  @ApiPropertyOptional({
    description: '按通知分类筛选',
    enum: NotificationCategory,
  })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  /**
   * 开始日期
   * 可选，查询此日期之后的通知（ISO 8601格式）
   */
  @ApiPropertyOptional({
    description: '开始日期（ISO 8601格式）',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * 结束日期
   * 可选，查询此日期之前的通知（ISO 8601格式）
   */
  @ApiPropertyOptional({
    description: '结束日期（ISO 8601格式）',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * 标记已读 DTO
 */
export class MarkAsReadDto {
  /**
   * 通知ID
   * 要标记为已读的通知ID
   */
  @ApiPropertyOptional({
    description: '通知ID（不传则标记所有为已读）',
    example: 'notification-123',
  })
  @IsOptional()
  notificationId?: string;
}
