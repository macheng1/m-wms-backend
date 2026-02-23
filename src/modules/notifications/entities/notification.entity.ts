import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { NotificationType, NotificationCategory, NotificationPriority } from '../interfaces/notification-type.enum';

/**
 * 通知实体
 *
 * 用于持久化存储通知消息，支持：
 * - 通知历史查询
 * - 未读状态管理
 * - 离线消息缓存
 */
@Entity('notifications')
@Index('notification_tenant_user_idx', ['tenantId', 'userId'])  // 租户+用户索引，用于查询用户通知
@Index('notification_tenant_idx', ['tenantId'])                  // 租户索引，用于广播消息
@Index('notification_user_read_idx', ['userId', 'isRead'])      // 用户+已读状态索引，用于查询未读
@Index('notification_created_idx', ['createdAt'])               // 创建时间索引，用于时间范围查询
export class Notification {
  /**
   * 主键ID - 使用 UUID 生成
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 租户ID
   * 用于多租户数据隔离，确保每个租户的数据互不干扰
   */
  @Column()
  tenantId: string;

  /**
   * 目标用户ID
   * - 有值：通知发送给指定用户
   * - 为空：广播通知，租户内所有用户可见
   */
  @Index('notification_user_id_idx')
  @Column({ type: 'char', length: 36, nullable: true })
  userId?: string;

  /**
   * 目标角色ID
   * - 有值：通知发送给拥有该角色的所有用户
   * - 为空：不按角色推送
   */
  @Column({ type: 'char', length: 36, nullable: true })
  roleId?: string;

  /**
   * 通知类型
   * 区分不同场景的通知：SYSTEM | MESSAGE | MENTION | TICKET | WORKFLOW
   */
  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  /**
   * 通知分类
   * 更细粒度的业务场景分类
   */
  @Column({
    type: 'enum',
    enum: NotificationCategory,
    nullable: true,
  })
  category?: NotificationCategory;

  /**
   * 通知标题
   * 简短的通知标题，用于列表展示
   */
  @Column({ length: 200 })
  title: string;

  /**
   * 通知内容
   * 详细的通知内容描述
   */
  @Column('text')
  message: string;

  /**
   * 扩展数据
   * 存储额外的结构化数据，如：关联的订单ID、产品信息等
   * 使用 JSON 类型存储，支持复杂对象
   */
  @Column({ type: 'json', nullable: true })
  data?: Record<string, any>;

  /**
   * 通知优先级
   * 用于决定通知的展示顺序和重要性
   */
  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  /**
   * 是否已读
   * - true：用户已阅读
   * - false：用户未阅读（默认）
   */
  @Column({ default: false })
  isRead: boolean;

  /**
   * 阅读时间
   * 用户首次阅读通知的时间，为空表示未读
   */
  @Column({ type: 'datetime', nullable: true })
  readAt?: Date;

  /**
   * 过期时间
   * 通知的过期时间，过期的通知可以自动清理或不再展示
   * - 为空：永不过期
   * - 有值：过期后自动归档或删除
   */
  @Index('notification_expire_idx')
  @Column({ type: 'datetime', nullable: true })
  expireAt?: Date;

  /**
   * 创建时间
   * 通知创建的时间戳，用于排序和查询
   */
  @CreateDateColumn()
  createdAt: Date;
}
