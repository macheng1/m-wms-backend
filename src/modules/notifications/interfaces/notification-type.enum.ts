/**
 * 通知类型枚举
 *
 * 定义系统中所有可能的通知类型，用于区分不同场景的通知消息
 */
export enum NotificationType {
  /**
   * 系统通知
   * 用于系统级别的消息，如：系统维护、版本更新、系统公告等
   */
  SYSTEM = 'SYSTEM',

  /**
   * 用户消息
   * 用于用户之间的私信、咨询等场景
   * 例如：用户咨询客服、用户之间的消息
   */
  MESSAGE = 'MESSAGE',

  /**
   * 提及/提醒
   * 用于@用户、任务分配等需要特定用户关注的场景
   * 例如：订单备注@仓管员、任务分配给某人
   */
  MENTION = 'MENTION',

  /**
   * 工单消息
   * 用于工单系统的消息通知
   * 例如：客服工单创建、更新、关闭等
   */
  TICKET = 'TICKET',

  /**
   * 流程通知
   * 用于业务流程中的审批、审核等环节
   * 例如：出库单审核、入库单审批等
   */
  WORKFLOW = 'WORKFLOW',
}

/**
 * 通知分类
 * 用于更细粒度地划分通知的业务场景
 */
export enum NotificationCategory {
  // 库存相关
  INVENTORY_WARNING = 'INVENTORY_WARNING',    // 库存预警
  INVENTORY_CHANGE = 'INVENTORY_CHANGE',      // 库存变更

  // 订单相关
  ORDER_CREATED = 'ORDER_CREATED',            // 订单创建
  ORDER_UPDATED = 'ORDER_UPDATED',            // 订单更新
  ORDER_CANCELLED = 'ORDER_CANCELLED',        // 订单取消
  ORDER_SHIPPED = 'ORDER_SHIPPED',            // 订单发货

  // 咨询相关
  CONSULTATION = 'CONSULTATION',              // 用户咨询
  REPLY = 'REPLY',                            // 回复消息

  // 系统相关
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',  // 系统维护
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',// 系统公告

  // 流程相关
  APPROVAL_PENDING = 'APPROVAL_PENDING',      // 待审批
  APPROVAL_APPROVED = 'APPROVAL_APPROVED',    // 已审批
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',    // 已拒绝
}

/**
 * 通知优先级
 * 用于决定通知的展示顺序和重要性
 */
export enum NotificationPriority {
  LOW = 'LOW',         // 低优先级
  NORMAL = 'NORMAL',   // 普通优先级（默认）
  HIGH = 'HIGH',       // 高优先级
  URGENT = 'URGENT',   // 紧急
}
