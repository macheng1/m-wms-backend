import { NotificationType, NotificationCategory, NotificationPriority } from '../interfaces/notification-type.enum';

/**
 * 通知响应 DTO
 *
 * 用于返回通知数据的标准化格式，确保前后端数据结构一致
 */
export class NotificationResponseDto {
  /**
   * 通知ID
   */
  id: string;

  /**
   * 租户ID
   */
  tenantId: string;

  /**
   * 目标用户ID
   * 为空表示广播通知
   */
  userId?: string;

  /**
   * 目标角色ID
   * 为空表示不按角色推送
   */
  roleId?: string;

  /**
   * 通知类型
   */
  type: NotificationType;

  /**
   * 通知分类
   */
  category?: NotificationCategory;

  /**
   * 通知标题
   */
  title: string;

  /**
   * 通知内容
   */
  message: string;

  /**
   * 扩展数据
   */
  data?: Record<string, any>;

  /**
   * 通知优先级
   */
  priority: NotificationPriority;

  /**
   * 是否已读
   */
  isRead: boolean;

  /**
   * 阅读时间
   */
  readAt?: Date;

  /**
   * 过期时间
   */
  expireAt?: Date;

  /**
   * 创建时间
   */
  createdAt: Date;
}

/**
 * 未读数量响应 DTO
 */
export class UnreadCountResponseDto {
  /**
   * 未读总数
   */
  total: number;

  /**
   * 各类型未读数量
   */
  byType: Record<NotificationType, number>;

  /**
   * 高优先级未读数量
   */
  highPriority: number;

  /**
   * 紧急未读数量
   */
  urgent: number;
}

/**
 * 分页响应 DTO
 *
 * 通用的分页响应结构
 */
export class PaginatedResponseDto<T> {
  /**
   * 数据列表
   */
  data: T[];

  /**
   * 总数
   */
  total: number;

  /**
   * 当前页码
   */
  page: number;

  /**
   * 每页数量
   */
  pageSize: number;

  /**
   * 总页数
   */
  totalPages: number;

  /**
   * 是否有下一页
   */
  hasNext: boolean;

  /**
   * 是否有上一页
   */
  hasPrev: boolean;
}
