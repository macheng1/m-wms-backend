/**
 * 实时通知系统 - 前端 TypeScript 类型定义
 *
 * 此文件可直接复制到前端项目中使用
 * 建议路径: types/notification.ts
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
 * 通知优先级
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
  /** 是否已读（查询时返回） */
  isRead?: boolean;
  /** 阅读时间（ISO 8601） */
  readAt?: string;
}

/**
 * 库存预警通知数据
 */
export interface StockWarningData {
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
  alertLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  /** 预警标签 */
  alertLabel?: string;
}

/**
 * 库存变更通知数据
 */
export interface StockChangeData {
  /** 产品SKU */
  sku: string;
  /** 产品名称 */
  productName: string;
  /** 交易类型 */
  transactionType: string;
  /** 交易类型显示名称 */
  typeDisplayName: string;
  /** 方向 */
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
 * 用户咨询通知数据
 */
export interface ConsultationData {
  /** 发起用户ID */
  fromUser: string;
  /** 发起用户名 */
  fromUserName: string;
  /** 咨询ID */
  consultationId?: string;
  /** 咨询内容预览 */
  preview?: string;
}

/**
 * 未读统计
 */
export interface UnreadCount {
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
 * 分页查询参数
 */
export interface NotificationListParams {
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
 * 分页响应
 */
export interface NotificationListResponse {
  /** 数据列表 */
  data: NotificationMessage[];
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
 * 标记已读请求
 */
export interface MarkAsReadRequest {
  /** 通知ID（不传则标记所有为已读） */
  notificationId?: string;
}

/**
 * SSE 事件类型
 */
export type SSEEventType = 'connected' | 'message' | 'heartbeat' | 'error';

/**
 * SSE 连接成功事件
 */
export interface SSEConnectedEvent {
  type: 'connected';
  data: {
    message: string;
    timestamp: string;
  };
}

/**
 * SSE 心跳事件
 */
export interface SSEHeartbeatEvent {
  type: 'heartbeat';
  data: {
    timestamp: string;
  };
}

/**
 * SSE 通知事件
 */
export interface SSEMessageEvent {
  type: 'message';
  data: NotificationMessage;
}

/**
 * SSE 事件联合类型
 */
export type SSEEvent = SSEConnectedEvent | SSEHeartbeatEvent | SSEMessageEvent;

/**
 * 通知配置
 */
export interface NotificationConfig {
  /** API 基础地址 */
  baseURL: string;
  /** 认证 Token */
  token: string;
  /** 租户 ID */
  tenantId: string;
  /** 是否自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
}
