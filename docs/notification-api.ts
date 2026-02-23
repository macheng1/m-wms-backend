/**
 * 通知系统 - 前端 TypeScript 接口定义
 *
 * 使用方式：
 * import { NotificationAPI, NotificationTypes, NotificationCategories } from './notification-api';
 */

/**
 * 通知类型枚举
 */
export enum NotificationType {
  /** 系统通知 */
  SYSTEM = 'SYSTEM',
  /** 用户消息 */
  MESSAGE = 'MESSAGE',
  /** 提及/提醒 */
  MENTION = 'MENTION',
  /** 工单消息 */
  TICKET = 'TICKET',
  /** 流程通知 */
  WORKFLOW = 'WORKFLOW',
}

/**
 * 通知分类枚举
 */
export enum NotificationCategory {
  /** 库存预警 */
  INVENTORY_WARNING = 'INVENTORY_WARNING',
  /** 库存变更 */
  INVENTORY_CHANGE = 'INVENTORY_CHANGE',
  /** 订单创建 */
  ORDER_CREATED = 'ORDER_CREATED',
  /** 订单更新 */
  ORDER_UPDATED = 'ORDER_UPDATED',
  /** 订单取消 */
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  /** 订单发货 */
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  /** 用户咨询 */
  CONSULTATION = 'CONSULTATION',
  /** 回复消息 */
  REPLY = 'REPLY',
  /** 系统维护 */
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  /** 系统公告 */
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  /** 待审批 */
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  /** 已审批 */
  APPROVAL_APPROVED = 'APPROVAL_APPROVED',
  /** 已拒绝 */
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
}

/**
 * 通知优先级枚举
 */
export enum NotificationPriority {
  /** 低优先级 */
  LOW = 'LOW',
  /** 普通优先级 */
  NORMAL = 'NORMAL',
  /** 高优先级 */
  HIGH = 'HIGH',
  /** 紧急 */
  URGENT = 'URGENT',
}

/**
 * SSE 事件类型
 */
export enum SSEEventType {
  /** 连接成功 */
  CONNECTED = 'connected',
  /** 收到通知 */
  MESSAGE = 'message',
  /** 心跳 */
  HEARTBEAT = 'heartbeat',
  /** 错误 */
  ERROR = 'error',
}

/**
 * 通知消息接口
 */
export interface NotificationMessage {
  /** 通知ID */
  id: string;
  /** 租户ID */
  tenantId: string;
  /** 目标用户ID（广播时为空） */
  userId?: string;
  /** 目标角色ID（按角色推送时） */
  roleId?: string;
  /** 通知类型 */
  type: NotificationType;
  /** 通知分类 */
  category?: NotificationCategory;
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  message: string;
  /** 扩展数据 */
  data?: Record<string, any>;
  /** 通知优先级 */
  priority: NotificationPriority;
  /** 创建时间（ISO 8601） */
  createdAt: string;
  /** 过期时间（ISO 8601） */
  expireAt?: string;
}

/**
 * SSE 连接成功事件
 */
export interface SSEConnectedEvent {
  event: 'connected';
  data: {
    message: string;
    timestamp: string;
  };
}

/**
 * SSE 心跳事件
 */
export interface SSEHeartbeatEvent {
  event: 'heartbeat';
  data: {
    timestamp: string;
  };
}

/**
 * SSE 通知事件
 */
export interface SSEMessageEvent {
  event: 'message';
  data: NotificationMessage;
}

/**
 * SSE 事件（联合类型）
 */
export type SSEEvent = SSEConnectedEvent | SSEHeartbeatEvent | SSEMessageEvent;

/**
 * 查询通知列表请求
 */
export interface QueryNotificationsRequest {
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
  /** 开始日期（ISO 8601） */
  startDate?: string;
  /** 结束日期（ISO 8601） */
  endDate?: string;
}

/**
 * 通知响应（带状态）
 */
export interface NotificationWithStatus extends NotificationMessage {
  /** 是否已读 */
  isRead: boolean;
  /** 阅读时间 */
  readAt?: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  data: T[];
  /** 总数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

/**
 * 未读数量响应
 */
export interface UnreadCountResponse {
  /** 未读总数 */
  total: number;
  /** 各类型未读数量 */
  byType: Record<NotificationType, number>;
  /** 高优先级未读数量 */
  highPriority: number;
  /** 紧急未读数量 */
  urgent: number;
}

/**
 * 标记已读请求
 */
export interface MarkAsReadRequest {
  /** 通知ID（不传则标记所有为已读） */
  notificationId?: string;
}

/**
 * API 响应基础结构
 */
export interface APIResponse<T = any> {
  /** 状态码 */
  code: number;
  /** 消息 */
  message: string;
  /** 数据 */
  data: T;
}

/**
 * 通知 API 接口
 */
export interface NotificationAPI {
  /**
   * SSE 订阅通知（实时推送）
   *
   * GET /api/notifications/subscribe
   *
   * 需要请求头：
   * - Authorization: Bearer {token}
   * - x-tenant-id: {tenantId}
   */
  subscribe(): EventSource;

  /**
   * 查询通知列表
   *
   * POST /api/notifications/list
   *
   * @param request 查询参数
   * @returns 分页的通知列表
   */
  getNotifications(request: QueryNotificationsRequest): Promise<PaginatedResponse<NotificationWithStatus>>;

  /**
   * 标记已读
   *
   * POST /api/notifications/read
   *
   * @param request 标记参数
   */
  markAsRead(request: MarkAsReadRequest): Promise<APIResponse<{ message: string }>>;

  /**
   * 获取未读数量
   *
   * GET /api/notifications/unread-count
   *
   * @returns 未读统计
   */
  getUnreadCount(): Promise<APIResponse<UnreadCountResponse>>;

  /**
   * 获取连接统计（管理员）
   *
   * GET /api/notifications/stats
   *
   * @returns 连接统计信息
   */
  getStats(): Promise<APIResponse<{
    totalConnections: number;
    tenantCount: number;
    tenants: Array<{
      tenantId: string;
      userCount: number;
      connectionCount: number;
    }>;
  }>>;
}

/**
 * 库存通知扩展数据
 */
export interface InventoryNotificationData {
  /** 产品SKU */
  sku: string;
  /** 产品名称 */
  productName: string;
  /** 当前库存 */
  currentQty: number;
  /** 安全库存 */
  safetyStock: number;
  /** 单位符号 */
  unitSymbol: string;
  /** 预警级别 */
  alertLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  /** 预警标签 */
  alertLabel?: string;
}

/**
 * 库存变更通知扩展数据
 */
export interface InventoryChangeData {
  /** 产品SKU */
  sku: string;
  /** 产品名称 */
  productName: string;
  /** 交易类型 */
  transactionType: string;
  /** 交易类型显示名称 */
  typeDisplayName: string;
  /** 方向：入库/出库 */
  direction: '入库' | '出库';
  /** 变更数量 */
  quantity: number;
  /** 变更前库存 */
  beforeQty: number;
  /** 变更后库存 */
  afterQty: number;
  /** 单位符号 */
  unitSymbol: string;
}

/**
 * 前端事件处理器类型
 */
export type NotificationEventHandler = (notification: NotificationMessage) => void;
export type ConnectedEventHandler = () => void;
export type ErrorHandler = (error: Event) => void;
