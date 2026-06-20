import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThan } from 'typeorm';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { Notification } from '../entities/notification.entity';
import { SseConnectionManager } from './sse-connection.manager';
import {
  ISendNotificationRequest,
  ISendToUsersRequest,
  IRedisNotificationMessage,
} from '../interfaces/notification.interface';
import { NotificationType, NotificationPriority } from '../interfaces/notification-type.enum';

/**
 * Redis Pub/Sub 频道名称
 * 用于多实例部署时的消息同步
 */
const REDIS_NOTIFICATION_CHANNEL = 'notifications:pubsub';

/**
 * 通知服务
 *
 * 核心业务逻辑，提供：
 * - 发送通知（租户广播/指定用户/指定角色）
 * - 查询通知历史
 * - 标记已读
 * - 未读统计
 * - Redis Pub/Sub 消息订阅
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private redisSubscriber: Redis;
  private redisPublisher: Redis;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private sseConnectionManager: SseConnectionManager,
  ) {
    // 初始化 Redis 订阅者
    this.initializeRedisSubscriber();
  }

  /**
   * 初始化 Redis 订阅者
   * 监听 Redis 频道，接收其他实例发送的通知
   */
  private initializeRedisSubscriber(): void {
    // 注意：这里需要注入 RedisService 的 client
    // 暂时留空，在模块中会进行配置
    this.logger.log('Redis 订阅者初始化（待配置）');
  }

  /**
   * 设置 Redis 订阅者
   * 由模块初始化时调用，注入 Redis 客户端
   */
  setRedisSubscriber(redis: Redis): void {
    this.redisSubscriber = redis;

    // 订阅通知频道
    this.redisSubscriber.subscribe(REDIS_NOTIFICATION_CHANNEL, (err) => {
      if (err) {
        this.logger.error('Redis 订阅失败', err);
      } else {
        this.logger.log(`已订阅 Redis 频道: ${REDIS_NOTIFICATION_CHANNEL}`);
      }
    });

    // 监听消息
    this.redisSubscriber.on('message', (channel, message) => {
      if (channel === REDIS_NOTIFICATION_CHANNEL) {
        this.handleRedisMessage(message);
      }
    });
  }

  /**
   * 设置 Redis 发布者
   * 由模块初始化时调用，注入 Redis 客户端
   * 注意：发布者连接不能调用 subscribe，必须与订阅者分开
   */
  setRedisPublisher(redis: Redis): void {
    this.redisPublisher = redis;
    this.logger.log('Redis 发布者已设置');
  }

  /**
   * 处理来自 Redis 的消息
   * 其他实例发送的通知会通过这里分发到对应的 SSE 连接
   */
  private handleRedisMessage(rawMessage: string): void {
    try {
      const message: IRedisNotificationMessage = JSON.parse(rawMessage);

      this.logger.debug(
        `收到 Redis 消息: 租户=${message.tenantId}, 用户=${message.userId || '广播'}, 类型=${message.type}`
      );

      // 如果有指定用户，发送给该用户
      if (message.userId) {
        this.sseConnectionManager.sendToUser(message.tenantId, message.userId, message);
      } else {
        // 否则广播给租户内所有用户
        this.sseConnectionManager.broadcastToTenant(message.tenantId, message);
      }
    } catch (error) {
      this.logger.error('解析 Redis 消息失败', error);
    }
  }

  /**
   * 发布消息到 Redis
   * 用于多实例部署时，同步通知到其他实例
   */
  private async publishToRedis(message: IRedisNotificationMessage): Promise<void> {
    try {
      await this.redisPublisher.publish(REDIS_NOTIFICATION_CHANNEL, JSON.stringify(message));
      this.logger.debug(`消息已发布到 Redis: ${message.id}`);
    } catch (error) {
      this.logger.error('发布消息到 Redis 失败', error);
    }
  }

  /**
   * 发送租户广播通知
   * 租户内所有用户都会收到
   */
  async send(request: ISendNotificationRequest): Promise<Notification> {
    const notification = this.createNotificationEntity(request);

    // 保存到数据库
    const saved = await this.notificationRepository.save(notification);

    // 构建 Redis 消息
    const redisMessage: IRedisNotificationMessage = {
      ...this.toNotificationMessage(saved),
      version: '1.0',
      timestamp: Date.now(),
    };

    // 发布到 Redis
    await this.publishToRedis(redisMessage);

    // 同时推送给当前实例的连接
    this.sseConnectionManager.broadcastToTenant(request.tenantId, redisMessage);

    this.logger.log(
      `发送广播通知: 租户=${request.tenantId}, 类型=${request.type}, 标题=${request.title}`
    );

    return saved;
  }

  /**
   * 发送通知给指定用户列表
   */
  async sendToUsers(request: ISendToUsersRequest): Promise<Notification[]> {
    const notifications: Notification[] = [];

    // 为每个用户创建通知
    for (const userId of request.userIds) {
      const notification = this.createNotificationEntity({
        tenantId: request.tenantId,
        type: request.type,
        category: request.category,
        title: request.title,
        message: request.message,
        data: request.data,
        priority: request.priority,
        ttl: request.ttl,
        userId,
      });
      notifications.push(notification);
    }

    // 批量保存到数据库
    const saved = await this.notificationRepository.save(notifications);

    // 推送给每个用户
    for (const notification of saved) {
      const redisMessage: IRedisNotificationMessage = {
        ...this.toNotificationMessage(notification),
        version: '1.0',
        timestamp: Date.now(),
      };

      await this.publishToRedis(redisMessage);
      this.sseConnectionManager.sendToUser(
        notification.tenantId,
        notification.userId!,
        redisMessage
      );
    }

    this.logger.log(
      `发送用户通知: 租户=${request.tenantId}, 用户数=${request.userIds.length}, 类型=${request.type}`
    );

    return saved;
  }

  /**
   * 发送通知给指定角色的所有用户
   * 需要查询拥有该角色的用户列表
   */
  async sendToRole(
    tenantId: string,
    roleCode: string,
    request: ISendNotificationRequest,
    roleUserIds: string[],
  ): Promise<Notification[]> {
    // 使用传入的用户ID列表
    if (!roleUserIds || roleUserIds.length === 0) {
      this.logger.warn(`角色 ${roleCode} 没有用户`);
      return [];
    }

    // 复用 sendToUsers 方法
    return this.sendToUsers({
      ...request,
      tenantId,
      userIds: roleUserIds,
    });
  }

  /**
   * 查询用户的通知列表
   */
  async findByUser(
    tenantId: string,
    userId: string,
    options: {
      page?: number;
      pageSize?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{ data: Notification[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      unreadOnly = false,
      type,
      startDate,
      endDate,
    } = options;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.tenantId = :tenantId', { tenantId })
      .andWhere('(notification.userId = :userId OR notification.userId IS NULL)', { userId });

    // 只查询未读
    if (unreadOnly) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead: false });
    }

    // 按类型筛选
    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    // 时间范围筛选
    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.andWhere('notification.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      } else if (startDate) {
        queryBuilder.andWhere('notification.createdAt >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.andWhere('notification.createdAt <= :endDate', { endDate });
      }
    }

    // 排除过期的通知
    queryBuilder.andWhere(
      '(notification.expireAt IS NULL OR notification.expireAt > :now)',
      { now: new Date() }
    );

    // 按创建时间倒序
    queryBuilder.orderBy('notification.createdAt', 'DESC');

    // 分页
    queryBuilder.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(tenantId: string, userId: string, notificationId?: string): Promise<void> {
    const now = new Date();

    if (notificationId) {
      // 标记单个通知为已读
      await this.notificationRepository.update(
        {
          id: notificationId,
          tenantId,
          userId,
        },
        {
          isRead: true,
          readAt: now,
        },
      );
      this.logger.log(`标记已读: 通知=${notificationId}, 用户=${userId}`);
    } else {
      // 标记所有未读通知为已读
      await this.notificationRepository.update(
        {
          tenantId,
          userId,
          isRead: false,
        },
        {
          isRead: true,
          readAt: now,
        },
      );
      this.logger.log(`标记所有已读: 用户=${userId}`);
    }
  }

  /**
   * 获取未读统计
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<{
    total: number;
    byType: Record<NotificationType, number>;
    highPriority: number;
    urgent: number;
  }> {
    // 查询所有未读通知
    const unreadNotifications = await this.notificationRepository.find({
      where: {
        tenantId,
        userId,
        isRead: false,
      },
    });

    // 按类型统计
    const byType: Record<string, number> = {};
    let highPriority = 0;
    let urgent = 0;

    unreadNotifications.forEach((notification) => {
      // 按类型统计
      byType[notification.type] = (byType[notification.type] || 0) + 1;

      // 按优先级统计
      if (notification.priority === NotificationPriority.HIGH) {
        highPriority++;
      } else if (notification.priority === NotificationPriority.URGENT) {
        urgent++;
      }
    });

    return {
      total: unreadNotifications.length,
      byType: byType as Record<NotificationType, number>,
      highPriority,
      urgent,
    };
  }

  /**
   * 清理过期通知
   * 定时任务调用，清理已过期的通知
   */
  async cleanExpiredNotifications(): Promise<number> {
    const result = await this.notificationRepository.delete({
      expireAt: LessThan(new Date()),
    });

    this.logger.log(`清理过期通知: ${result.affected} 条`);
    return result.affected || 0;
  }

  /**
   * 创建通知实体
   */
  private createNotificationEntity(request: ISendNotificationRequest & { userId?: string; roleId?: string }): Notification {
    const notification = new Notification();
    notification.id = randomUUID();
    notification.tenantId = request.tenantId;
    notification.userId = request.userId;
    notification.roleId = request.roleId;
    notification.type = request.type;
    notification.category = request.category;
    notification.title = request.title;
    notification.message = request.message;
    notification.data = request.data;
    notification.priority = request.priority || NotificationPriority.NORMAL;
    notification.isRead = false;

    // 计算过期时间
    if (request.ttl && request.ttl > 0) {
      const expireAt = new Date();
      expireAt.setSeconds(expireAt.getSeconds() + request.ttl);
      notification.expireAt = expireAt;
    }

    return notification;
  }

  /**
   * 转换为通知消息格式
   */
  private toNotificationMessage(notification: Notification): any {
    return {
      id: notification.id,
      tenantId: notification.tenantId,
      userId: notification.userId,
      roleId: notification.roleId,
      type: notification.type,
      category: notification.category,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      priority: notification.priority,
      createdAt: notification.createdAt.toISOString(),
      expireAt: notification.expireAt?.toISOString(),
    };
  }
}
