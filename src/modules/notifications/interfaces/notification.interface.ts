import { NotificationType, NotificationCategory, NotificationPriority } from './notification-type.enum';

/**
 * 通知消息基础接口
 *
 * 定义通知消息的基本结构，用于 SSE 推送和内部消息传递
 */
export interface INotificationMessage {
  /** 通知唯一标识 */
  id: string;

  /** 租户ID - 用于多租户隔离 */
  tenantId: string;

  /** 目标用户ID（可选，为空表示广播） */
  userId?: string;

  /** 目标角色ID（可选，用于按角色推送） */
  roleId?: string;

  /** 通知类型 */
  type: NotificationType;

  /** 通知分类 */
  category: NotificationCategory;

  /** 通知标题 */
  title: string;

  /** 通知内容 */
  message: string;

  /** 扩展数据（可选，用于携带额外信息） */
  data?: Record<string, any>;

  /** 通知优先级 */
  priority: NotificationPriority;

  /** 创建时间 */
  createdAt: string;

  /** 过期时间（可选） */
  expireAt?: string;
}

/**
 * 发送通知的请求接口
 */
export interface ISendNotificationRequest {
  /** 租户ID */
  tenantId: string;

  /** 通知类型 */
  type: NotificationType;

  /** 通知分类（可选） */
  category?: NotificationCategory;

  /** 通知标题 */
  title: string;

  /** 通知内容 */
  message: string;

  /** 扩展数据（可选） */
  data?: Record<string, any>;

  /** 优先级（默认为 NORMAL） */
  priority?: NotificationPriority;

  /** 过期时间（可选，秒数，默认7天） */
  ttl?: number;
}

/**
 * 发送给指定用户的通知请求
 */
export interface ISendToUsersRequest extends ISendNotificationRequest {
  /** 目标用户ID列表 */
  userIds: string[];
}

/**
 * 发送给指定角色的通知请求
 */
export interface ISendToRoleRequest extends ISendNotificationRequest {
  /** 目标角色代码 */
  roleCode: string;
}

/**
 * 查询通知的请求接口
 */
export interface IQueryNotificationsRequest {
  /** 页码（从1开始） */
  page?: number;

  /** 每页数量 */
  pageSize?: number;

  /** 只查询未读 */
  unreadOnly?: boolean;

  /** 按类型筛选 */
  type?: NotificationType;

  /** 按分类筛选 */
  category?: NotificationCategory;

  /** 开始日期 */
  startDate?: Date;

  /** 结束日期 */
  endDate?: Date;
}

/**
 * SSE 连接信息
 */
export interface ISseConnection {
  /** 租户ID */
  tenantId: string;

  /** 用户ID */
  userId: string;

  /** 响应对象 */
  response: any;

  /** 连接创建时间 */
  connectedAt: Date;

  /** 最后心跳时间 */
  lastHeartbeat: Date;
}

/**
 * Redis 发布的消息格式
 */
export interface IRedisNotificationMessage extends INotificationMessage {
  /** 消息版本，用于兼容性处理 */
  version: string;

  /** 消息发送时间戳 */
  timestamp: number;
}
